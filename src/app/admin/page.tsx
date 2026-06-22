import { AdminPage } from "@sovia/admin";
import { getAdminCopy, getDefaultAdminCopy } from "@sovia/admin/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
const copy = getDefaultAdminCopy();

export const metadata: Metadata = {
  title: copy.metadata.title,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminRoute({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getCurrentSiteLocale();

  return <AdminPage copy={getAdminCopy(locale)} error={error} />;
}
