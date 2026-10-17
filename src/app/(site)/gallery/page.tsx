import { GalleryLanding } from "@sovia/gallery";
import { getGalleryCopy } from "@sovia/gallery/i18n/copy";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getSharedPageMetadata } from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();

  return getSharedPageMetadata(locale, "gallery", "/gallery");
}

export default async function GalleryPage() {
  const locale = await getCurrentSiteLocale();
  return (
    <GalleryLanding
      copy={getGalleryCopy(locale)}
      locale={locale}
      title={getSharedCopy(locale).pages.gallery.title}
    />
  );
}
