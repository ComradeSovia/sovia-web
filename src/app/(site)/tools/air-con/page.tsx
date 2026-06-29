import { AirConTool } from "@sovia/air-con";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getSharedPageMetadata } from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();

  return getSharedPageMetadata(locale, "airCon", "/tools/air-con");
}

export default async function AirConRoute() {
  const localizedCopy = getSharedCopy(await getCurrentSiteLocale());

  return <AirConTool copy={localizedCopy} />;
}
