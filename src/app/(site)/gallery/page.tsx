import { UnderConstruction } from "@sovia/shared";
import { getDefaultSharedCopy, getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
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

export default async function GalleryPage() {
  const localizedCopy = getSharedCopy(await getCurrentSiteLocale());

  return (
    <UnderConstruction
      copy={localizedCopy}
      title={localizedCopy.pages.gallery.title}
    />
  );
}
