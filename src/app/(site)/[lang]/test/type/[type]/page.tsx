import { SoviaTestTypeComponent } from "@sovia/sovia-test";
import {
  matchSoviaTestLocale,
  type SoviaTestLocale,
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

type LocalizedTestTypePageProps = {
  params: Promise<{
    lang: string;
    type: string;
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
}: LocalizedTestTypePageProps): Promise<Metadata> {
  const { lang, type } = await params;
  const locale = getLocale(lang);
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

export default async function LocalizedTestTypePage({
  params,
}: LocalizedTestTypePageProps) {
  const { lang, type } = await params;
  const locale = getLocale(lang);
  const code = type.toUpperCase();

  if (!defaultTestCopy.types[code]) {
    notFound();
  }

  return <SoviaTestTypeComponent initialLocale={locale} type={code} />;
}
