import type { Metadata } from "next";
import { UnderConstruction } from "@/components/under-construction";

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
