import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { SoviaTestTypesComponent } from "@sovia/sovia-test";
import {
  matchSoviaTestLocale,
  type SoviaTestLocale,
} from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import { getSoviaTestAlternates } from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ lang: string; testLang: string }>;
};

function getLocales(lang: string, testLang: string) {
  const siteLocale = matchSiteLocale(lang);
  const testLocale = matchSoviaTestLocale(testLang);

  if (!siteLocale || !testLocale) {
    notFound();
  }

  return { siteLocale, testLocale };
}

function getSiteTestPath(
  path: string,
  siteLocale: SiteLocale,
  testLocale: SoviaTestLocale,
) {
  return getSiteLocalizedPath(`/test/${testLocale}${path}`, siteLocale);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, testLang } = await params;
  const { siteLocale, testLocale } = getLocales(lang, testLang);
  const testCopy = getSoviaTestCopy(testLocale);
  const path = "/test/types";

  return {
    title: testCopy.typesPage.title,
    description: testCopy.typesPage.subtitle,
    alternates: {
      ...getSoviaTestAlternates(path, testLocale),
      canonical: getSiteTestPath("/types", siteLocale, testLocale),
    },
    openGraph: {
      title: testCopy.typesPage.title,
      description: testCopy.typesPage.subtitle,
      url: getSiteTestPath("/types", siteLocale, testLocale),
      locale: testLocale.replace("-", "_"),
    },
  };
}

export default async function LocalizedSiteTestTypesPage({
  params,
}: PageProps) {
  const { lang, testLang } = await params;
  const { siteLocale, testLocale } = getLocales(lang, testLang);

  if (siteLocale === DEFAULT_SITE_LOCALE) {
    redirect(`/test/${testLocale}/types`);
  }

  return <SoviaTestTypesComponent initialLocale={testLocale} />;
}
