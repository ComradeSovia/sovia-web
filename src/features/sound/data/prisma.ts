import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrlError } from "./database-errors";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function isBuildPhase() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

export function hasDatabaseUrl() {
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

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const databaseUrlError = getDatabaseUrlError();
  if (databaseUrlError) {
    return null;
  }

  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
