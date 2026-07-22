import { getSovietAnimePageMetadata, SovietAnimePage } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();

  return getSovietAnimePageMetadata(getHomeCopy(locale), locale);
}

export default async function SovietAnimeRoutePage() {
  const locale = await getCurrentSiteLocale();

  return <SovietAnimePage copy={getHomeCopy(locale)} locale={locale} />;
}
