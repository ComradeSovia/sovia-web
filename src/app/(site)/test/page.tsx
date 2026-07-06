import { loadMusicIndex } from "@sovia/sound";
import { SoviaTestComponent } from "@sovia/sovia-test";
import { loadSoviaTestStats } from "@sovia/sovia-test/data/submissions";
import {
  getSoviaTestLocaleFromSearchParams,
  type SoviaTestSearchParams,
} from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  createSoviaTestPageSchema,
  getSoviaTestPageMetadata,
} from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { Suspense } from "react";

type TestPageProps = {
  searchParams: Promise<SoviaTestSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: TestPageProps): Promise<Metadata> {
  const locale = getSoviaTestLocaleFromSearchParams(await searchParams);
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

export default async function TestPage({ searchParams }: TestPageProps) {
  const locale = getSoviaTestLocaleFromSearchParams(await searchParams);
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
