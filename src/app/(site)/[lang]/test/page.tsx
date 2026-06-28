import { loadMusicIndex } from "@sovia/sound";
import { SoviaTestComponent } from "@sovia/sovia-test";
import {
  matchSoviaTestLocale,
  type SoviaTestLocale,
} from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  getSoviaTestAlternates,
  getSoviaTestCanonicalPath,
} from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type LocalizedTestPageProps = {
  params: Promise<{
    lang: string;
  }>;
};

function getLocale(lang: string): SoviaTestLocale {
  const locale = matchSoviaTestLocale(lang);

  if (!locale) {
    notFound();
  }

  return locale;
}

export async function generateMetadata({
  params,
}: LocalizedTestPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLocale(lang);
  const testCopy = getSoviaTestCopy(locale);
  const path = "/test";

  return {
    title: testCopy.page.title,
    description: testCopy.page.subtitle,
    alternates: getSoviaTestAlternates(path, locale),
    openGraph: {
      title: testCopy.page.title,
      description: testCopy.page.subtitle,
      url: getSoviaTestCanonicalPath(path, locale),
      locale: locale.replace("-", "_"),
    },
  };
}

export default async function LocalizedTestPage({
  params,
}: LocalizedTestPageProps) {
  const { lang } = await params;
  const locale = getLocale(lang);
  const recommendedMusicWorks = await loadMusicIndex();

  return (
    <Suspense fallback={null}>
      <SoviaTestComponent
        initialLocale={locale}
        recommendedMusicWorks={recommendedMusicWorks}
      />
    </Suspense>
  );
}
