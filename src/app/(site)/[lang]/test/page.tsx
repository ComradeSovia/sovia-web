import { loadMusicIndex } from "@sovia/sound";
import { SoviaTestComponent } from "@sovia/sovia-test";
import { loadSoviaTestStats } from "@sovia/sovia-test/data/submissions";
import {
  matchSoviaTestLocale,
  type SoviaTestLocale,
} from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  createSoviaTestPageSchema,
  getSoviaTestPageMetadata,
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
    ...getSoviaTestPageMetadata({
      description: testCopy.page.subtitle,
      locale,
      path,
      title: testCopy.page.title,
    }),
  };
}

export default async function LocalizedTestPage({
  params,
}: LocalizedTestPageProps) {
  const { lang } = await params;
  const locale = getLocale(lang);
  const testCopy = getSoviaTestCopy(locale);
  const jsonLd = createSoviaTestPageSchema({
    description: testCopy.page.subtitle,
    locale,
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
          initialLocale={locale}
          recommendedMusicWorks={recommendedMusicWorks}
          stats={stats}
        />
      </Suspense>
    </>
  );
}
