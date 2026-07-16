import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "@sovia/shared/i18n/site-routing";
import {
  getLocalizedWorkTitle,
  getWorkDescription,
  loadMusicWorkWithContent,
  SoundDetail,
} from "@sovia/sound";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string }>;
}): Promise<Metadata> {
  const { path } = await params;
  const locale = await getCurrentSiteLocale();
  const sharedCopy = getSharedCopy(locale);
  const work = await loadMusicWorkWithContent(path);

  if (!work) {
    return {
      title: "Sound Work Not Found",
    };
  }

  const description = getWorkDescription(work, locale);
  const basePath = `/sound/${work.path}`;
  const canonical = getSiteLocalizedPath(basePath, locale);
  const title = getLocalizedWorkTitle(work, locale);
  const thumbnail = work.u2bId
    ? `https://img.youtube.com/vi/${work.u2bId}/maxresdefault.jpg`
    : "/opengraph-image";

  return {
    title,
    description,
    alternates: getSiteMetadataAlternates(basePath, locale),
    openGraph: {
      type: "music.song",
      url: canonical,
      siteName: sharedCopy.site.name,
      title: `${title} | ${sharedCopy.site.name}`,
      description,
      images: [
        {
          url: thumbnail,
          width: 1280,
          height: 720,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${sharedCopy.site.name}`,
      description,
      images: [thumbnail],
    },
  };
}

export default async function SoundDetailPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const locale = await getCurrentSiteLocale();

  const work = await loadMusicWorkWithContent(path);

  if (!work || !work.u2bId) {
    notFound();
  }

  return <SoundDetail locale={locale} work={work} />;
}
