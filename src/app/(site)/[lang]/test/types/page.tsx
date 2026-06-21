import { SoviaTestTypesComponent } from "@sovia/sovia-test";
import {
  matchSoviaTestLocale,
  type SoviaTestLocale,
} from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import { getSoviaTestAlternates } from "@sovia/sovia-test/i18n/seo";
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
    alternates: getSoviaTestAlternates(path, locale),
    openGraph: {
      title: testCopy.typesPage.title,
      description: testCopy.typesPage.subtitle,
      url: `/${locale}${path}`,
      locale: locale.replace("-", "_"),
    },
  };
}

export default async function LocalizedTestTypesPage({
  params,
}: LocalizedTestTypesPageProps) {
  const { lang } = await params;
  const locale = getLocale(lang);

  return <SoviaTestTypesComponent initialLocale={locale} />;
}
