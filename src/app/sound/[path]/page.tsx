import { notFound } from "next/navigation";
import { loadAllMusicWorks } from "@/lib/load-music";
import {
  loadMusicDescription,
  loadMusicLyrics,
} from "@/lib/load-music-md";
import { U2BThumbnail } from "@/components/u2b-thumbnail";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

export default async function SoundDetailPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  const works = await loadAllMusicWorks();
  const work = works.find((w) => w.path === path);

  if (!work || !work.u2bId) {
    notFound();
  }

  const description = loadMusicDescription(work.vid);
  const lyrics = loadMusicLyrics(work.vid);

  return (
    <section className="space-y-12 max-w-3xl mx-auto">
      <U2BThumbnail u2bId={work.u2bId} alt={work.title} />

      <header className="space-y-2">
        <h1>{work.title}</h1>

        {work.series && <div className="meta">{work.series}</div>}

        <p>
          {work.original
            ? `Adapted from ${work.original}`
            : "Original work"}
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
          <h2>Description</h2>
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{description}</ReactMarkdown>
        </section>
      )}

      {lyrics && (
        <section className="space-y-4">
          <h2>Lyrics</h2>
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{lyrics}</ReactMarkdown>
        </section>
      )}
    </section>
  );
}
