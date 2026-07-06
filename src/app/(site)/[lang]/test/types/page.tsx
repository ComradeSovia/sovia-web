import { SoviaTestTypesComponent } from "@sovia/sovia-test";
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

type LocalizedTestTypesPageProps = {
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
}: LocalizedTestTypesPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLocale(lang);
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

export default async function LocalizedTestTypesPage({
  params,
}: LocalizedTestTypesPageProps) {
  const { lang } = await params;
  const locale = getLocale(lang);
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
