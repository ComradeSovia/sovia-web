import { SITE_NAME } from "@sovia/shared";
import {
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
  const work = await loadMusicWorkWithContent(path);

  if (!work) {
    return {
      title: "Sound Work Not Found",
    };
  }

  const description = getWorkDescription(work);
  const canonical = `/sound/${work.path}`;
  const thumbnail = work.u2bId
    ? `https://img.youtube.com/vi/${work.u2bId}/maxresdefault.jpg`
    : "/opengraph-image";

  return {
    title: work.title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "music.song",
      url: canonical,
      siteName: SITE_NAME,
      title: `${work.title} | ${SITE_NAME}`,
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
      title: `${work.title} | ${SITE_NAME}`,
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

  const work = await loadMusicWorkWithContent(path);

  if (!work || !work.u2bId) {
    notFound();
  }

  return <SoundDetail work={work} />;
}
