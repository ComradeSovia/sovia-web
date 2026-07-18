import { getFriendlyDatabaseError } from "@sovia/sound/data/database-errors";
import { getPrismaClient } from "@sovia/sound/data/prisma";

export type AdminYoutubeLocaleInput = {
  enabled: boolean;
  label: string;
  locale: string;
  position: number;
};

export async function listAdminYoutubeLocales() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  return prisma.adminYoutubeLocale.findMany({
    orderBy: [{ position: "asc" }, { locale: "asc" }],
  });
}

export async function listEnabledAdminYoutubeLocales() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  return prisma.adminYoutubeLocale.findMany({
    orderBy: [{ position: "asc" }, { locale: "asc" }],
    where: { enabled: true },
  });
}

export async function upsertAdminYoutubeLocale(input: AdminYoutubeLocaleInput) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  return prisma.adminYoutubeLocale.upsert({
    create: input,
    update: {
      enabled: input.enabled,
      label: input.label,
      position: input.position,
    },
    where: { locale: input.locale },
  });
}

export async function deleteAdminYoutubeLocale(locale: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  await prisma.adminYoutubeLocale.delete({
    where: { locale },
  });
}
