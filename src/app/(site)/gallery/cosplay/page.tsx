import { CosplayPage } from "@sovia/gallery";
import { getCosplayPhotoPath } from "@sovia/gallery/data/cosplay";
import { getGalleryCopy } from "@sovia/gallery/i18n/copy";
import { createSiteMetadata } from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getGalleryCopy(locale);
  return createSiteMetadata({
    locale,
    path: "/gallery/cosplay",
    title: `${copy.albumTitle} | ${copy.category}`,
    description: copy.albumDescription,
    openGraph: {
      images: [
        {
          url: getCosplayPhotoPath(8),
          width: 4096,
          height: 2731,
          alt: `${copy.credit}. ${copy.photoDescriptions["08"]}`,
        },
      ],
    },
  });
}

export default async function CosplayGalleryPage() {
  const locale = await getCurrentSiteLocale();
  return <CosplayPage copy={getGalleryCopy(locale)} locale={locale} />;
}
