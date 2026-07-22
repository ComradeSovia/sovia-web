import { siteUrl } from "@sovia/shared";
import {
  DEFAULT_SITE_LOCALE,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { createMusicRecordingSchema } from "@sovia/shared/seo/schema";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { getSoundCopy } from "../i18n/copy";
import { getWorkDescription, getWorkTitle } from "../lib/metadata";
import { getBilibiliVideoUrl, getVkVideoUrl } from "../lib/platform-urls";
import type { MusicWorkWithContent } from "../model/music";
import { U2BThumbnail } from "./u2b-thumbnail";

export function SoundDetail({
  locale = DEFAULT_SITE_LOCALE,
  work,
}: {
  locale?: SiteLocale;
  work: MusicWorkWithContent;
}) {
  const copy = getSoundCopy(locale);
  const title = getWorkTitle(work);
  const hasDescription = Boolean(work.introText || work.productionNotes);
  const jsonLd = createMusicRecordingSchema({
    description: getWorkDescription(work, locale),
    image: work.u2bId
      ? `https://img.youtube.com/vi/${work.u2bId}/maxresdefault.jpg`
      : siteUrl("/opengraph-image"),
    original: work.original,
    path: work.path,
    series: work.series,
    title,
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
          alt={`YouTube thumbnail for ${title}`}
          blurDataURL={work.thumbnailBlurDataUrl}
          u2bId={work.u2bId}
        />
      )}

      <header className="space-y-3">
        <h1 className="text-4xl leading-none sm:text-5xl">{title}</h1>

        {work.series && <div className="meta">{work.series}</div>}

        <p>
          {work.original ? `Adapted from ${work.original}` : "Original work"}
        </p>

        {work.shortDescription ? <p>{work.shortDescription}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          {work.u2bId ? (
            <a
              href={`https://www.youtube.com/watch?v=${work.u2bId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              {copy.card.watchYoutube}
            </a>
          ) : null}
          {work.bilibiliId ? (
            <a
              href={getBilibiliVideoUrl(work.bilibiliId)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              {copy.card.watchBilibili}
            </a>
          ) : null}
          {work.vkId ? (
            <a
              href={getVkVideoUrl(work.vkId)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              {copy.card.watchVk}
            </a>
          ) : null}
        </div>
      </header>

      {hasDescription && (
        <section className="space-y-4">
          <h2 className="text-3xl sm:text-4xl">Description</h2>
          {work.introText ? (
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
              {work.introText}
            </ReactMarkdown>
          ) : null}
          {work.productionNotes ? (
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
              {work.productionNotes}
            </ReactMarkdown>
          ) : null}
        </section>
      )}

      {work.lyrics && (
        <section className="space-y-4">
          <h2 className="text-3xl sm:text-4xl">Lyrics</h2>
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>
            {work.lyrics}
          </ReactMarkdown>
        </section>
      )}
    </section>
  );
}
