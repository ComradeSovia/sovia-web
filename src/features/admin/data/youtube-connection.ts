import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getPrismaClient } from "@sovia/sound/data/prisma";

const CONNECTION_ID = "primary";
const ALGORITHM = "aes-256-gcm";

export function getYoutubeOAuthConfig() {
  const clientId = process.env.YOUTUBE_DATA_API_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_DATA_API_CLIENT_SECRET?.trim();
  const encryptionKey = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY?.trim();
  const missing: string[] = [];

  if (!clientId) missing.push("YOUTUBE_DATA_API_CLIENT_ID");
  if (!clientSecret) missing.push("YOUTUBE_DATA_API_CLIENT_SECRET");
  if (!encryptionKey) missing.push("YOUTUBE_TOKEN_ENCRYPTION_KEY");

  if (!clientId || !clientSecret || !encryptionKey) {
    return { missing, ok: false as const };
  }

  return { clientId, clientSecret, encryptionKey, ok: true as const };
}

function getEncryptionKey(value: string) {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(
      "YOUTUBE_TOKEN_ENCRYPTION_KEY must be 32 bytes in Base64 format.",
    );
  }
  return key;
}

function encryptRefreshToken(refreshToken: string, keyValue: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(keyValue), iv);
  const encrypted = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedRefreshToken: encrypted.toString("base64"),
    tokenAuthTag: cipher.getAuthTag().toString("base64"),
    tokenIv: iv.toString("base64"),
  };
}

function decryptRefreshToken(
  connection: {
    encryptedRefreshToken: string;
    tokenAuthTag: string;
    tokenIv: string;
  },
  keyValue: string,
) {
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(keyValue),
    Buffer.from(connection.tokenIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(connection.tokenAuthTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(connection.encryptedRefreshToken, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getAdminYoutubeConnection() {
  const prisma = getPrismaClient();
  if (!prisma) return null;
  return prisma.adminYoutubeConnection.findUnique({
    where: { id: CONNECTION_ID },
  });
}

export async function getAdminYoutubeCredentials() {
  const config = getYoutubeOAuthConfig();
  if (!config.ok) {
    throw new Error(
      `Missing YouTube configuration: ${config.missing.join(", ")}.`,
    );
  }
  const connection = await getAdminYoutubeConnection();
  if (!connection) {
    throw new Error(
      "Connect a YouTube channel from the admin dashboard first.",
    );
  }
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: decryptRefreshToken(connection, config.encryptionKey),
  };
}

export async function saveAdminYoutubeConnection({
  channelId,
  channelTitle,
  refreshToken,
  scopes,
}: {
  channelId: string;
  channelTitle: string;
  refreshToken: string;
  scopes: string;
}) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");
  const config = getYoutubeOAuthConfig();
  if (!config.ok) throw new Error("YouTube OAuth configuration is incomplete.");
  const encrypted = encryptRefreshToken(refreshToken, config.encryptionKey);
  return prisma.adminYoutubeConnection.upsert({
    create: {
      id: CONNECTION_ID,
      channelId,
      channelTitle,
      scopes,
      ...encrypted,
    },
    update: { channelId, channelTitle, scopes, ...encrypted },
    where: { id: CONNECTION_ID },
  });
}

export async function deleteAdminYoutubeConnection() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");
  await prisma.adminYoutubeConnection.deleteMany({
    where: { id: CONNECTION_ID },
  });
}
