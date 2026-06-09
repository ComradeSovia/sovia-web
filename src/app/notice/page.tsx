import { UnderConstruction } from "@sovia/shared";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notice",
  description: "Notices and important information for the Comrade Sovia site.",
  alternates: {
    canonical: "/notice",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function NoticePage() {
  return <UnderConstruction title="Notice" />;
}
