import { SoviaTestTypeComponent } from "@sovia/sovia-test";
import { loadSoviaTestStats } from "@sovia/sovia-test/data/submissions";
import {
  getSoviaTestLocaleFromSearchParams,
  type SoviaTestSearchParams,
} from "@sovia/sovia-test/i18n/config";
import {
  getDefaultSoviaTestCopy,
  getSoviaTestCopy,
} from "@sovia/sovia-test/i18n/copy";
import {
  getSoviaTestAlternates,
  getSoviaTestCanonicalPath,
} from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const defaultTestCopy = getDefaultSoviaTestCopy();

type TypePageProps = {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<SoviaTestSearchParams>;
};

export async function generateMetadata({
  params,
  searchParams,
}: TypePageProps): Promise<Metadata> {
  const { type } = await params;
  const locale = getSoviaTestLocaleFromSearchParams(await searchParams);
  const testCopy = getSoviaTestCopy(locale);
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
    alternates: getSoviaTestAlternates(path, locale),
    openGraph: {
      title: `${code} | ${archetype.title}`,
      description: archetype.description,
      url: getSoviaTestCanonicalPath(path, locale),
      locale: locale.replace("-", "_"),
    },
  };
}

export default async function TestTypePage({
  params,
  searchParams,
}: TypePageProps) {
  const { type } = await params;
  const locale = getSoviaTestLocaleFromSearchParams(await searchParams);
  const code = type.toUpperCase();

  if (!defaultTestCopy.types[code]) {
    notFound();
  }

  const stats = await loadSoviaTestStats();

  return (
    <SoviaTestTypeComponent initialLocale={locale} stats={stats} type={code} />
  );
}
