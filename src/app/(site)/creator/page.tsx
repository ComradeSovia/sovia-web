import { CreatorPage, getCreatorPageMetadata } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  return getCreatorPageMetadata(getHomeCopy(locale), locale);
}

export default async function Page() {
  const locale = await getCurrentSiteLocale();
  return <CreatorPage copy={getHomeCopy(locale).creator} locale={locale} />;
}
