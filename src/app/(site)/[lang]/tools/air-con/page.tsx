import { AirConTool } from "@sovia/air-con";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type LocalizedAirConParams = Promise<{ lang: string }>;

function getLocale(lang: string) {
  return matchSiteLocale(lang);
}

export async function generateMetadata({
  params,
}: {
  params: LocalizedAirConParams;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    return {};
  }

  const copy = getSharedCopy(locale);

  return {
    title: copy.pages.airCon.title,
    description: copy.pages.airCon.subtitle,
    alternates: getSiteMetadataAlternates("/tools/air-con", locale),
  };
}

export default async function LocalizedAirConPage({
  params,
}: {
  params: LocalizedAirConParams;
}) {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    notFound();
  }

  if (locale === DEFAULT_SITE_LOCALE) {
    redirect("/tools/air-con");
  }

  return <AirConTool copy={getSharedCopy(locale)} />;
}
