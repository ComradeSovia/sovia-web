import type { Metadata } from "next";
import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Request",
  description: "Request a song or adaptation for the Comrade Sovia archive.",
  alternates: {
    canonical: "/request",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function RequestPage() {
  return <UnderConstruction title="Request" />;
}
