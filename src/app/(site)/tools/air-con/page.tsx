import { AirConTool } from "@sovia/air-con";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    title: copy.pages.airCon.title,
    description: copy.pages.airCon.subtitle,
    alternates: getSiteMetadataAlternates("/tools/air-con", locale),
  };
}

export default async function AirConRoute() {
  const localizedCopy = getSharedCopy(await getCurrentSiteLocale());

  return <AirConTool copy={localizedCopy} />;
}
