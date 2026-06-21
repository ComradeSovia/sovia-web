import { UnderConstruction } from "@sovia/shared";
import { getDefaultSharedCopy } from "@sovia/shared/i18n/copy";
import type { Metadata } from "next";

const copy = getDefaultSharedCopy();

export const metadata: Metadata = {
  title: copy.pages.request.title,
  description: copy.pages.request.description,
  alternates: {
    canonical: "/request",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function RequestPage() {
  return <UnderConstruction title={copy.pages.request.title} />;
}
