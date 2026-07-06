import { SoviaTestTypesComponent } from "@sovia/sovia-test";
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

type TestTypesPageProps = {
  searchParams: Promise<SoviaTestSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: TestTypesPageProps): Promise<Metadata> {
  const locale = getSoviaTestLocaleFromSearchParams(await searchParams);
  const testCopy = getSoviaTestCopy(locale);
  const path = "/test/types";

  return {
    title: testCopy.typesPage.title,
    description: testCopy.typesPage.subtitle,
    ...getSoviaTestPageMetadata({
      description: testCopy.typesPage.subtitle,
      locale,
      path,
      title: testCopy.typesPage.title,
    }),
  };
}

export default async function TestTypesPage({
  searchParams,
}: TestTypesPageProps) {
  const locale = getSoviaTestLocaleFromSearchParams(await searchParams);
  const testCopy = getSoviaTestCopy(locale);
  const jsonLd = createSoviaTestPageSchema({
    description: testCopy.typesPage.subtitle,
    locale,
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

      <SoviaTestTypesComponent initialLocale={locale} stats={stats} />
    </>
  );
}
