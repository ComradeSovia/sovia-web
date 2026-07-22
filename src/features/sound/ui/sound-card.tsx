import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Link from "next/link";
import type { SoundCopy } from "../i18n/copy";
import { getBilibiliVideoUrl, getVkVideoUrl } from "../lib/platform-urls";
import type { MusicWork } from "../model/music";
import { U2BThumbnail } from "./u2b-thumbnail";

export function SoundCard({
  copy,
  locale,
  work,
}: {
  copy: SoundCopy;
  locale: SiteLocale;
  work: MusicWork;
}) {
  if (!work.u2bId) return null;

  return (
    <div className="card flex flex-col gap-4">
      <U2BThumbnail
        alt={`YouTube thumbnail for ${work.title}`}
        blurDataURL={work.thumbnailBlurDataUrl}
        u2bId={work.u2bId}
      />

      <div className="space-y-1">
        <h3 className="text-2xl">{work.title}</h3>

        <p className="text-sm">
          {work.original
            ? copy.card.adaptedFrom.replace("{{original}}", work.original)
            : copy.card.originalWork}
        </p>

        {work.series && <div className="meta">{work.series}</div>}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={getSiteLocalizedPath(`/sound/${work.path}`, locale)}
          className="btn-outline"
        >
          {copy.card.details}
        </Link>
        <a
          href={`https://www.youtube.com/watch?v=${work.u2bId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
          {copy.card.watchYoutube}
        </a>
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
    </div>
  );
}
