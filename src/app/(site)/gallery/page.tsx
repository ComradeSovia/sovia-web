import { UnderConstruction } from "@sovia/shared";
import { getDefaultSharedCopy } from "@sovia/shared/i18n/copy";
import type { Metadata } from "next";

const copy = getDefaultSharedCopy();

export const metadata: Metadata = {
  title: copy.pages.gallery.title,
  description: copy.pages.gallery.description,
  alternates: {
    canonical: "/gallery",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function GalleryPage() {
  return <UnderConstruction title={copy.pages.gallery.title} />;
}
