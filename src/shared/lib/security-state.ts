import { createHash } from "node:crypto";
import { getPrismaClient } from "@sovia/sound/data/prisma";

// Shared across instances and restarts. No raw credentials or IPs are stored.
export async function claimSecurityState(
  key: string,
  expiresAt: Date,
  limit = 1,
) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Security state database unavailable.");
  const digest = createHash("sha256").update(key).digest("hex");
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "security_states" ("key", "count", "expiresAt")
    VALUES (${digest}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET "count" = "security_states"."count" + 1
    WHERE "security_states"."count" < ${limit}
    RETURNING "count"
  `;
  return rows.length > 0;
}

export async function allowRequest(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  return claimSecurityState(
    `${scope}:${identity}:${bucket}`,
    new Date((bucket + 1) * windowSeconds * 1000),
    limit,
  );
}
