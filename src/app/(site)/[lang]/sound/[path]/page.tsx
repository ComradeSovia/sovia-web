import { getSharedCopy } from "@sovia/shared/i18n/copy";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "@sovia/shared/i18n/site-routing";
import {
  getWorkDescription,
  loadMusicWorkWithContent,
  SoundDetail,
} from "@sovia/sound";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type LocalizedSoundDetailParams = Promise<{ lang: string; path: string }>;

function getLocale(lang: string) {
  return matchSiteLocale(lang);
}

export async function generateMetadata({
  params,
}: {
  params: LocalizedSoundDetailParams;
}): Promise<Metadata> {
  const { lang, path } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    return {};
  }

  const sharedCopy = getSharedCopy(locale);
  const work = await loadMusicWorkWithContent(path);

  if (!work) {
    return {
      title: "Sound Work Not Found",
    };
  }

  const basePath = `/sound/${work.path}`;
  const description = getWorkDescription(work);
  const thumbnail = work.u2bId
    ? `https://img.youtube.com/vi/${work.u2bId}/maxresdefault.jpg`
    : "/opengraph-image";

  return {
    title: work.title,
    description,
    alternates: getSiteMetadataAlternates(basePath, locale),
    openGraph: {
      type: "music.song",
      url: getSiteLocalizedPath(basePath, locale),
      siteName: sharedCopy.site.name,
      title: `${work.title} | ${sharedCopy.site.name}`,
      description,
      images: [
        {
          url: thumbnail,
          width: 1280,
          height: 720,
          alt: work.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${work.title} | ${sharedCopy.site.name}`,
      description,
      images: [thumbnail],
    },
  };
}

export default async function LocalizedSoundDetailPage({
  params,
}: {
  params: LocalizedSoundDetailParams;
}) {
  const { lang, path } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    notFound();
  }

  if (locale === DEFAULT_SITE_LOCALE) {
    redirect(`/sound/${path}`);
  }

  const work = await loadMusicWorkWithContent(path);

  if (!work || !work.u2bId) {
    notFound();
  }

  return <SoundDetail work={work} />;
}
