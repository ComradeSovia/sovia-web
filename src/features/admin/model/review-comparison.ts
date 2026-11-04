import type { findRequestMatches } from "../data/song-requests";

export type ComparisonSong = {
  title: string;
  artist: string | null;
  origin: string | null;
  direction: string | null;
};
export type ComparisonCandidate = ComparisonSong & {
  id: string;
  kind: "plan" | "request" | "work" | "batch";
  status: string;
  href: string;
  workSummary?: string;
  selectable?: boolean;
};
type Matches = Awaited<ReturnType<typeof findRequestMatches>>;
export function planComparison(plan: Matches[0][number]): ComparisonCandidate {
  const published = plan.works.filter(
    (w) =>
      w.match === "FULL" &&
      w.work.status?.visible &&
      w.work.status.publishedAt?.trim(),
  );
  return {
    id: plan.id,
    kind: "plan",
    title: plan.title,
    artist: plan.sourceArtists,
    origin: plan.from,
    direction: plan.notes,
    status: plan.status,
    href: `/admin/todo/${encodeURIComponent(plan.id)}`,
    selectable: plan.status !== "CANCELLED",
    workSummary: published.length
      ? `Published full matches: ${published.map((w) => w.work.content?.songTitle || w.contentId).join(", ")}`
      : `${plan.works.length} linked Works · no published full match`,
  };
}
function artistText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return null;
  return (
    value
      .map((a) =>
        typeof a === "string"
          ? a
          : a &&
              typeof a === "object" &&
              "name" in a &&
              typeof a.name === "string"
            ? a.name
            : "",
      )
      .filter(Boolean)
      .join(", ") || null
  );
}
export function workComparison(work: Matches[1][number]): ComparisonCandidate {
  return {
    id: work.contentId,
    kind: "work",
    title: work.content?.songTitle || work.contentId,
    artist: artistText(work.source?.artists),
    origin: work.source?.title || null,
    direction: work.content?.productionNotes || work.content?.introText || null,
    status:
      work.status?.visible && work.status.publishedAt?.trim()
        ? "Published and visible"
        : "Draft / hidden / withdrawn",
    href: `/admin/content/${encodeURIComponent(work.contentId)}`,
    selectable: false,
    workSummary:
      "A Work must be linked from a production plan. Partial or related versions do not complete a request.",
  };
}
