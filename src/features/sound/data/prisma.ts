import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrlError } from "./database-errors";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const DATABASE_CONNECTION_TIMEOUT_MS = 30_000;
const DATABASE_QUERY_TIMEOUT_MS = 30_000;

function isBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function ensureDatabaseUrlFromEnvFile() {
  if (process.env.DATABASE_URL) return;

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*DATABASE_URL\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;

    const value = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (value) {
      process.env.DATABASE_URL = value;
    }
    return;
  }
}

export function hasDatabaseUrl() {
  ensureDatabaseUrlFromEnvFile();

  return (
    !isBuildPhase() &&
    Boolean(process.env.DATABASE_URL) &&
    !getDatabaseUrlError()
  );
}

export function getPrismaClient() {
  if (isBuildPhase()) {
    return null;
  }

  ensureDatabaseUrlFromEnvFile();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const databaseUrlError = getDatabaseUrlError();
  if (databaseUrlError) {
    return null;
  }

  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
      connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
      max: 5,
      query_timeout: DATABASE_QUERY_TIMEOUT_MS,
      statement_timeout: DATABASE_QUERY_TIMEOUT_MS,
    });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
