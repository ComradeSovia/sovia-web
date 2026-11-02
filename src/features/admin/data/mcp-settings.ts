import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getPrismaClient } from "@sovia/sound/data/prisma";

export function requireMcpDatabase() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("MCP database unavailable.");
  return prisma;
}

export async function getMcpSettings() {
  const settings = await requireMcpDatabase().adminMcpSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings)
    throw new Error(
      "MCP settings unavailable. Apply the database migration first.",
    );
  return settings;
}

export function hashMcpKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function matchesMcpKey(key: string, hash: string | null) {
  if (!hash || !key) return false;
  const candidate = Buffer.from(hashMcpKey(key));
  const expected = Buffer.from(hash);
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

export function generateMcpKey() {
  return `sovia_mcp_${randomBytes(32).toString("base64url")}`;
}
