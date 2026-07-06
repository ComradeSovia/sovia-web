import { matchSiteLocale } from "@sovia/shared/i18n/site-locale";
import { SoviaTestTypesComponent } from "@sovia/sovia-test";
import { loadSoviaTestStats } from "@sovia/sovia-test/data/submissions";
import { matchSoviaTestLocale } from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  createSoviaTestPageSchema,
  getSoviaTestPageMetadata,
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
    ...getSoviaTestPageMetadata({
      description: testCopy.typesPage.subtitle,
      locale: testLocale,
      path,
      title: testCopy.typesPage.title,
    }),
  };
}

export default async function LocalizedSiteTestTypesPage({
  params,
}: PageProps) {
  const { lang, testLang } = await params;
  const testLocale = getLocales(lang, testLang);
  const testCopy = getSoviaTestCopy(testLocale);
  const jsonLd = createSoviaTestPageSchema({
    description: testCopy.typesPage.subtitle,
    locale: testLocale,
    path: "/test/types",
    title: testCopy.typesPage.title,
  });
  const stats = await loadSoviaTestStats();

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is generated from local structured data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SoviaTestTypesComponent initialLocale={testLocale} stats={stats} />
    </>
  );
}
