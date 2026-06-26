import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import { ToolsPage } from "@sovia/tools";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    title: copy.pages.tools.title,
    description: copy.pages.tools.description,
    alternates: getSiteMetadataAlternates("/tools", locale),
  };
}

export default async function ToolsRoute() {
  const locale = await getCurrentSiteLocale();
  const localizedCopy = getSharedCopy(locale);

  return <ToolsPage copy={localizedCopy} locale={locale} />;
}
