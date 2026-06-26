import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { SoviaTestTypeComponent } from "@sovia/sovia-test";
import {
  matchSoviaTestLocale,
  type SoviaTestLocale,
} from "@sovia/sovia-test/i18n/config";
import {
  getDefaultSoviaTestCopy,
  getSoviaTestCopy,
} from "@sovia/sovia-test/i18n/copy";
import { getSoviaTestAlternates } from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

const defaultTestCopy = getDefaultSoviaTestCopy();

type PageProps = {
  params: Promise<{ lang: string; testLang: string; type: string }>;
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
  const { lang, testLang, type } = await params;
  const { siteLocale, testLocale } = getLocales(lang, testLang);
  const testCopy = getSoviaTestCopy(testLocale);
  const code = type.toUpperCase();
  const archetype = testCopy.types[code] ?? defaultTestCopy.types[code];
  const path = `/test/type/${type.toLowerCase()}`;

  if (!archetype) {
    return {
      title: testCopy.typesPage.title,
    };
  }

  return {
    title: `${code} | ${archetype.title}`,
    description: archetype.description,
    alternates: {
      ...getSoviaTestAlternates(path, testLocale),
      canonical: getSiteTestPath(
        `/type/${type.toLowerCase()}`,
        siteLocale,
        testLocale,
      ),
    },
    openGraph: {
      title: `${code} | ${archetype.title}`,
      description: archetype.description,
      url: getSiteTestPath(
        `/type/${type.toLowerCase()}`,
        siteLocale,
        testLocale,
      ),
      locale: testLocale.replace("-", "_"),
    },
  };
}

export default async function LocalizedSiteTestTypePage({ params }: PageProps) {
  const { lang, testLang, type } = await params;
  const { siteLocale, testLocale } = getLocales(lang, testLang);
  const code = type.toUpperCase();

  if (!defaultTestCopy.types[code]) {
    notFound();
  }

  if (siteLocale === DEFAULT_SITE_LOCALE) {
    redirect(`/test/${testLocale}/type/${type.toLowerCase()}`);
  }

  return <SoviaTestTypeComponent initialLocale={testLocale} type={code} />;
}
