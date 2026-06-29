import { AirConTool } from "@sovia/air-con";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getSharedPageMetadata } from "@sovia/shared/i18n/metadata";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
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

  return getSharedPageMetadata(locale, "airCon", "/tools/air-con");
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
