import { siteUrl } from "@sovia/shared";
import { createMusicRecordingSchema } from "@sovia/shared/seo/schema";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { getWorkDescription } from "../lib/metadata";
import type { MusicWorkWithContent } from "../model/music";
import { U2BThumbnail } from "./u2b-thumbnail";

export function SoundDetail({ work }: { work: MusicWorkWithContent }) {
  const descriptionLangs = Object.keys(work.descriptions || {});
  const lyricsLangs = Object.keys(work.lyrics || {});

  const description =
    descriptionLangs.length > 0
      ? work.descriptions?.[descriptionLangs[0]]
      : null;
  const lyrics = lyricsLangs.length > 0 ? work.lyrics?.[lyricsLangs[0]] : null;
  const jsonLd = createMusicRecordingSchema({
    description: getWorkDescription(work),
    image: work.u2bId
      ? `https://img.youtube.com/vi/${work.u2bId}/maxresdefault.jpg`
      : siteUrl("/opengraph-image"),
    original: work.original,
    path: work.path,
    series: work.series,
    title: work.title,
    u2bId: work.u2bId,
  });

  return (
    <section className="mx-auto max-w-3xl space-y-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is generated from local structured data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {work.u2bId && (
        <U2BThumbnail
          alt={`YouTube thumbnail for ${work.title}`}
          blurDataURL={work.thumbnailBlurDataUrl}
          u2bId={work.u2bId}
        />
      )}

      <header className="space-y-3">
        <h1 className="text-4xl leading-none sm:text-5xl">{work.title}</h1>

        {work.series && <div className="meta">{work.series}</div>}

        <p>
          {work.original ? `Adapted from ${work.original}` : "Original work"}
        </p>

        {work.u2bId && (
          <a
            href={`https://www.youtube.com/watch?v=${work.u2bId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex"
          >
            Watch on YouTube
          </a>
        )}
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
