import { SiteNotFound } from "@sovia/layout";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    title: copy.notFound.title,
    description: copy.notFound.description,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function NotFound() {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return <SiteNotFound copy={copy} locale={locale} />;
}
