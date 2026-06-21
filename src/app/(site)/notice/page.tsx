import { UnderConstruction } from "@sovia/shared";
import { getDefaultSharedCopy } from "@sovia/shared/i18n/copy";
import type { Metadata } from "next";

const copy = getDefaultSharedCopy();

export const metadata: Metadata = {
  title: copy.pages.notice.title,
  description: copy.pages.notice.description,
  alternates: {
    canonical: "/notice",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function NoticePage() {
  return <UnderConstruction title={copy.pages.notice.title} />;
}
