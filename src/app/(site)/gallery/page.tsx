import { UnderConstruction } from "@sovia/shared";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Image gallery and visual archive for Comrade Sovia.",
  alternates: {
    canonical: "/gallery",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function GalleryPage() {
  return <UnderConstruction title="Gallery" />;
}
