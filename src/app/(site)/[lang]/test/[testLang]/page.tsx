import { matchSiteLocale } from "@sovia/shared/i18n/site-locale";
import { SoviaTestComponent } from "@sovia/sovia-test";
import { matchSoviaTestLocale } from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  getSoviaTestAlternates,
  getSoviaTestCanonicalPath,
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
    alternates: getSoviaTestAlternates(path, testLocale),
    openGraph: {
      title: testCopy.page.title,
      description: testCopy.page.subtitle,
      url: getSoviaTestCanonicalPath(path, testLocale),
      locale: testLocale.replace("-", "_"),
    },
  };
}

export default async function LocalizedSiteTestPage({ params }: PageProps) {
  const { lang, testLang } = await params;
  const testLocale = getLocales(lang, testLang);

  return (
    <Suspense fallback={null}>
      <SoviaTestComponent initialLocale={testLocale} />
    </Suspense>
  );
}
