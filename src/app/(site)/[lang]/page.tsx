import { HomePage as HomePageContent } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

function getLocale(lang: string) {
  return matchSiteLocale(lang);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    return {};
  }

  const copy = getSharedCopy(locale);

  return {
    title: copy.site.title,
    description: copy.site.description,
    alternates: getSiteMetadataAlternates("/", locale),
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    notFound();
  }

  if (locale === DEFAULT_SITE_LOCALE) {
    redirect("/");
  }

  return (
    <HomePageContent
      copy={getHomeCopy(locale)}
      locale={locale}
      sharedCopy={getSharedCopy(locale)}
    />
  );
}
