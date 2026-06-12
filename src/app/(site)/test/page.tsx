import { SoviaTestComponent } from "@sovia/sovia-test";
import { getDefaultSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import type { Metadata } from "next";
import { Suspense } from "react";

const testCopy = getDefaultSoviaTestCopy();

export const metadata: Metadata = {
  title: testCopy.page.title,
  description: testCopy.page.subtitle,
  alternates: {
    canonical: "/test",
  },
  openGraph: {
    title: testCopy.page.title,
    description: testCopy.page.subtitle,
    url: "/test",
  },
};

export default function TestPage() {
  return (
    <Suspense fallback={null}>
      <SoviaTestComponent />
    </Suspense>
  );
}
