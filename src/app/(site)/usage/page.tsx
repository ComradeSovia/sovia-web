import { ResourceUsagePage } from "@sovia/home";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getSharedPageMetadata } from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  return getSharedPageMetadata(locale, "usage", "/usage");
}

export default async function UsageRoute() {
  const locale = await getCurrentSiteLocale();
  return <ResourceUsagePage copy={getSharedCopy(locale)} locale={locale} />;
}
