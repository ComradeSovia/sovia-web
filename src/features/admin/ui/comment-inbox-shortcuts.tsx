import Link from "next/link";
import { getCommentTriageSummary } from "../data/youtube-comments";
import { getAdminYoutubeConnection } from "../data/youtube-connection";

export async function CommentInboxShortcuts() {
  const channel = await getAdminYoutubeConnection();
  const counts = await getCommentTriageSummary(channel?.channelId);
  const queues = [
    {
      label: "Unclassified",
      count: counts.unclassified,
      query: "category=UNCLASSIFIED",
    },
    {
      label: "Possible song requests",
      count: counts.possibleRequests,
      query: "candidate=true",
    },
    {
      label: "Song requests to link",
      count: counts.unlinkedRequests,
      query: "category=SONG_REQUEST&unlinked=true",
    },
  ];
  return (
    <nav
      aria-label="YouTube comment inbox"
      className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm"
    >
      <Link
        className="font-medium text-zinc-100 hover:underline"
        href="/admin/comments"
      >
        YouTube comment inbox
      </Link>
      {queues.map(({ label, count, query }) => (
        <Link
          key={query}
          prefetch={false}
          className="text-zinc-300 hover:text-white hover:underline"
          href={`/admin/comments?${query}`}
        >
          {label}{" "}
          <span className="font-semibold tabular-nums">
            {count.toLocaleString("en-US")}
          </span>
        </Link>
      ))}
    </nav>
  );
}
