import { UnderConstruction } from "@sovia/shared";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report",
  description: "Updates, notes, and archive reports from Comrade Sovia.",
  alternates: {
    canonical: "/report",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ReportPage() {
  return <UnderConstruction title="Report" />;
}
