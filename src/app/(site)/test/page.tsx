import { SoviaTestComponent } from "@sovia/sovia-test";
import {
  getSoviaTestLocaleFromSearchParams,
  type SoviaTestSearchParams,
} from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  getSoviaTestAlternates,
  getSoviaTestCanonicalPath,
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
    alternates: getSoviaTestAlternates(path, locale),
    openGraph: {
      title: testCopy.page.title,
      description: testCopy.page.subtitle,
      url: getSoviaTestCanonicalPath(path, locale),
      locale: locale.replace("-", "_"),
    },
  };
}

export default async function TestPage({ searchParams }: TestPageProps) {
  const locale = getSoviaTestLocaleFromSearchParams(await searchParams);

  return (
    <Suspense fallback={null}>
      <SoviaTestComponent initialLocale={locale} />
    </Suspense>
  );
}
