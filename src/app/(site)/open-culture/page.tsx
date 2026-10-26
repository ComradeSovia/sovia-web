import { OpenCulturePage } from "@sovia/home";
import { getOpenCultureCopy } from "@sovia/home/i18n/open-culture/copy";
import { OPEN_CULTURE_PATH } from "@sovia/shared/constants/routes";
import { createSiteMetadata } from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getOpenCultureCopy(locale);
  return createSiteMetadata({
    locale,
    path: OPEN_CULTURE_PATH,
    title: copy.title,
    description: copy.lead,
  });
}

export default async function Page() {
  const locale = await getCurrentSiteLocale();
  return <OpenCulturePage copy={getOpenCultureCopy(locale)} locale={locale} />;
}
