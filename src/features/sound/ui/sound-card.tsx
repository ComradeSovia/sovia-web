import Link from "next/link";
import { getDefaultSoundCopy } from "../i18n/copy";
import type { MusicWork } from "../model/music";
import { U2BThumbnail } from "./u2b-thumbnail";

const copy = getDefaultSoundCopy();

export function SoundCard({ work }: { work: MusicWork }) {
  if (!work.u2bId) return null;

  return (
    <div className="card flex flex-col gap-4">
      <U2BThumbnail u2bId={work.u2bId} alt={work.title} />

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
        <Link href={`/sound/${work.path}`} className="btn-outline">
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
      </div>
    </div>
  );
}
