import { matchSiteLocale } from "@sovia/shared/i18n/site-locale";
import { loadMusicIndex } from "@sovia/sound";
import { SoviaTestComponent } from "@sovia/sovia-test";
import { loadSoviaTestStats } from "@sovia/sovia-test/data/submissions";
import { matchSoviaTestLocale } from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  createSoviaTestPageSchema,
  getSoviaTestPageMetadata,
} from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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
  const path = "/test";

  return {
    title: testCopy.page.title,
    description: testCopy.page.subtitle,
    ...getSoviaTestPageMetadata({
      description: testCopy.page.subtitle,
      locale: testLocale,
      path,
      title: testCopy.page.title,
    }),
  };
}

export default async function LocalizedSiteTestPage({ params }: PageProps) {
  const { lang, testLang } = await params;
  const testLocale = getLocales(lang, testLang);
  const testCopy = getSoviaTestCopy(testLocale);
  const jsonLd = createSoviaTestPageSchema({
    description: testCopy.page.subtitle,
    locale: testLocale,
    path: "/test",
    title: testCopy.page.title,
  });
  const [recommendedMusicWorks, stats] = await Promise.all([
    loadMusicIndex(),
    loadSoviaTestStats(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is generated from local structured data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Suspense fallback={null}>
        <SoviaTestComponent
          initialLocale={testLocale}
          recommendedMusicWorks={recommendedMusicWorks}
          stats={stats}
        />
      </Suspense>
    </>
  );
}
