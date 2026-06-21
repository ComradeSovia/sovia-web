import { UnderConstruction } from "@sovia/shared";
import { getDefaultSharedCopy } from "@sovia/shared/i18n/copy";
import type { Metadata } from "next";

const copy = getDefaultSharedCopy();

export const metadata: Metadata = {
  title: copy.pages.report.title,
  description: copy.pages.report.description,
  alternates: {
    canonical: "/report",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ReportPage() {
  return <UnderConstruction title={copy.pages.report.title} />;
}
