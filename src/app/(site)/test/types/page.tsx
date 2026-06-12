import { SoviaTestTypesComponent } from "@sovia/sovia-test";
import { getDefaultSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import type { Metadata } from "next";

const testCopy = getDefaultSoviaTestCopy();

export const metadata: Metadata = {
  title: testCopy.typesPage.title,
  description: testCopy.typesPage.subtitle,
  alternates: {
    canonical: "/test/types",
  },
  openGraph: {
    title: testCopy.typesPage.title,
    description: testCopy.typesPage.subtitle,
    url: "/test/types",
  },
};

export default function TestTypesPage() {
  return <SoviaTestTypesComponent />;
}
