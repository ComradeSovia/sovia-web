import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { U2BThumbnail } from "@/components/u2b-thumbnail";
import { SITE_NAME, siteUrl } from "@/config/site";
import { loadMusicWorkWithContent } from "@/lib/load-music";

export const dynamic = "force-dynamic";

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function getWorkDescription(
  work: NonNullable<ReturnType<typeof loadMusicWorkWithContent>>,
) {
  const descriptions = Object.values(work.descriptions || {});
  const firstDescription = descriptions.find(Boolean);

  if (firstDescription) {
    return truncate(stripMarkdown(firstDescription), 155);
  }

  const source = work.original
    ? `Adapted from ${work.original}`
    : "An original Comrade Sovia work";
  const series = work.series ? ` from ${work.series}` : "";

  return truncate(
    `${source}${series}. Listen on YouTube and read archive notes in the Comrade Sovia sound collection.`,
    155,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string }>;
}): Promise<Metadata> {
  const { path } = await params;
  const work = loadMusicWorkWithContent(path);

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

  const work = loadMusicWorkWithContent(path);

  if (!work || !work.u2bId) {
    notFound();
  }

  const descriptionLangs = Object.keys(work.descriptions || {});
  const lyricsLangs = Object.keys(work.lyrics || {});

  const description =
    descriptionLangs.length > 0
      ? work.descriptions?.[descriptionLangs[0]]
      : null;
  const lyrics = lyricsLangs.length > 0 ? work.lyrics?.[lyricsLangs[0]] : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: work.title,
    byArtist: {
      "@type": "MusicGroup",
      name: SITE_NAME,
      url: siteUrl("/"),
    },
    url: siteUrl(`/sound/${work.path}`),
    image: work.u2bId
      ? `https://img.youtube.com/vi/${work.u2bId}/maxresdefault.jpg`
      : siteUrl("/opengraph-image"),
    inAlbum: work.series
      ? {
          "@type": "MusicAlbum",
          name: work.series,
        }
      : undefined,
    isBasedOn: work.original || undefined,
    sameAs: work.u2bId
      ? `https://www.youtube.com/watch?v=${work.u2bId}`
      : undefined,
  };

  return (
    <section className="space-y-12 max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is generated from local structured data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <U2BThumbnail u2bId={work.u2bId} alt={work.title} />

      <header className="space-y-3">
        <h1 className="text-4xl leading-none sm:text-5xl">{work.title}</h1>

        {work.series && <div className="meta">{work.series}</div>}

        <p>
          {work.original ? `Adapted from ${work.original}` : "Original work"}
        </p>

        <a
          href={`https://www.youtube.com/watch?v=${work.u2bId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex"
        >
          Watch on YouTube
        </a>
      </header>

      {description && (
        <section className="space-y-4">
          <h2 className="text-3xl sm:text-4xl">Description</h2>
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>
            {description}
          </ReactMarkdown>
        </section>
      )}

      {lyrics && (
        <section className="space-y-4">
          <h2 className="text-3xl sm:text-4xl">Lyrics</h2>
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{lyrics}</ReactMarkdown>
        </section>
      )}
    </section>
  );
}
