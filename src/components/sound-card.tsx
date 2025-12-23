import { U2BThumbnail } from "@/components/u2b-thumbnail";
import type { MusicWork } from "@/definitions/data-type/music";

export interface SoundCardProps {
  work: MusicWork;
}

export function SoundCard({ work }: SoundCardProps) {
  if (!work.u2bId) return null;

  return (
    <div className="card space-y-4">
      <U2BThumbnail u2bId={work.u2bId} alt={work.title} />

      <div className="space-y-1">
        <h3>{work.title}</h3>

        <p className="text-sm">
          {work.original ? `Adapted from ${work.original}` : "Original work"}
        </p>

        {work.series && <div className="meta">{work.series}</div>}
      </div>

      {/* Action */}
      <div className="pt-2">
        <a
          href={`https://www.youtube.com/watch?v=${work.u2bId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline inline-flex items-center justify-center"
        >
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}
