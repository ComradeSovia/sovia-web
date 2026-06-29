import { matchSiteLocale } from "@sovia/shared/i18n/site-locale";
import { SoviaTestTypesComponent } from "@sovia/sovia-test";
import { loadSoviaTestStats } from "@sovia/sovia-test/data/submissions";
import { matchSoviaTestLocale } from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  getSoviaTestAlternates,
  getSoviaTestCanonicalPath,
} from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ lang: string; testLang: string }>;
};

function getLocales(lang: string, testLang: string) {
  const siteLocale = matchSiteLocale(lang);
  const testLocale = matchSoviaTestLocale(testLang);

  if (!siteLocale || !testLocale) {
    notFound();
  }

  return testLocale;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, testLang } = await params;
  const testLocale = getLocales(lang, testLang);
  const testCopy = getSoviaTestCopy(testLocale);
  const path = "/test/types";

  return {
    title: testCopy.typesPage.title,
    description: testCopy.typesPage.subtitle,
    alternates: getSoviaTestAlternates(path, testLocale),
    openGraph: {
      title: testCopy.typesPage.title,
      description: testCopy.typesPage.subtitle,
      url: getSoviaTestCanonicalPath(path, testLocale),
      locale: testLocale.replace("-", "_"),
    },
  };
}

export default async function LocalizedSiteTestTypesPage({
  params,
}: PageProps) {
  const { lang, testLang } = await params;
  const testLocale = getLocales(lang, testLang);
  const stats = await loadSoviaTestStats();

  return <SoviaTestTypesComponent initialLocale={testLocale} stats={stats} />;
}
