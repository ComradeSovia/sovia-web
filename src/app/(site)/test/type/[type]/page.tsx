import { SoviaTestTypeComponent } from "@sovia/sovia-test";
import { getDefaultSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const testCopy = getDefaultSoviaTestCopy();

type TypePageProps = {
  params: Promise<{
    type: string;
  }>;
};

export async function generateMetadata({
  params,
}: TypePageProps): Promise<Metadata> {
  const { type } = await params;
  const code = type.toUpperCase();
  const archetype = testCopy.types[code];

  if (!archetype) {
    return {
      title: testCopy.typesPage.title,
    };
  }

  return {
    title: `${code} | ${archetype.title}`,
    description: archetype.description,
    alternates: {
      canonical: `/test/type/${type.toLowerCase()}`,
    },
    openGraph: {
      title: `${code} | ${archetype.title}`,
      description: archetype.description,
      url: `/test/type/${type.toLowerCase()}`,
    },
  };
}

export default async function TestTypePage({ params }: TypePageProps) {
  const { type } = await params;
  const code = type.toUpperCase();

  if (!testCopy.types[code]) {
    notFound();
  }

  return <SoviaTestTypeComponent type={code} />;
}
