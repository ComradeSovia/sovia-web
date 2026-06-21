import { SoviaTestTypesComponent } from "@sovia/sovia-test";
import {
  getSoviaTestLocaleFromSearchParams,
  type SoviaTestSearchParams,
} from "@sovia/sovia-test/i18n/config";
import { getSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import { getSoviaTestAlternates } from "@sovia/sovia-test/i18n/seo";
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
    alternates: getSoviaTestAlternates(path, locale),
    openGraph: {
      title: testCopy.typesPage.title,
      description: testCopy.typesPage.subtitle,
      url: path,
      locale: locale.replace("-", "_"),
    },
  };
}

export default function TestTypesPage() {
  return <SoviaTestTypesComponent />;
}
