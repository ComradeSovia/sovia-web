import { AboutProjectPage, getAboutPageMetadata } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  return getAboutPageMetadata(getHomeCopy(locale), locale);
}

export default async function AboutPage() {
  const locale = await getCurrentSiteLocale();
  return <AboutProjectPage copy={getHomeCopy(locale).about} locale={locale} />;
}
