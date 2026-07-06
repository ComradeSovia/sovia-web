import { matchSiteLocale } from "@sovia/shared/i18n/site-locale";
import { SoviaTestTypeComponent } from "@sovia/sovia-test";
import { loadSoviaTestStats } from "@sovia/sovia-test/data/submissions";
import { matchSoviaTestLocale } from "@sovia/sovia-test/i18n/config";
import {
  getDefaultSoviaTestCopy,
  getSoviaTestCopy,
} from "@sovia/sovia-test/i18n/copy";
import { getSoviaTestPageMetadata } from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  return testLocale;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, testLang, type } = await params;
  const testLocale = getLocales(lang, testLang);
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
    ...getSoviaTestPageMetadata({
      description: archetype.description,
      locale: testLocale,
      path,
      title: `${code} | ${archetype.title}`,
    }),
  };
}

export default async function LocalizedSiteTestTypePage({ params }: PageProps) {
  const { lang, testLang, type } = await params;
  const testLocale = getLocales(lang, testLang);
  const code = type.toUpperCase();

  if (!defaultTestCopy.types[code]) {
    notFound();
  }

  const stats = await loadSoviaTestStats();

  return (
    <SoviaTestTypeComponent
      initialLocale={testLocale}
      stats={stats}
      type={code}
    />
  );
}
