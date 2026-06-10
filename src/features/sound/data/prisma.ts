import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrlError } from "./database-errors";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL) && !getDatabaseUrlError();
}

export function getPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const databaseUrlError = getDatabaseUrlError();
  if (databaseUrlError) {
    throw new Error(databaseUrlError);
  }

  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
