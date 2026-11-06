import { commentHash } from "./comment-source";
import { planningPrisma } from "./song-requests";

export const REVIEW_KINDS = [
  "requests",
  "drafts",
  "comments",
  "replies",
] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];
export const REVIEW_LABELS: Record<ReviewKind, string> = {
  requests: "Recommendations",
  drafts: "Planning drafts",
  comments: "Comment reviews",
  replies: "Reply follow-ups",
};
const requestWhere = {
  status: { in: ["PENDING", "NEEDS_INFO"] as ("PENDING" | "NEEDS_INFO")[] },
};
const draftWhere = { status: "DRAFT" as const };
const commentWhere = { reviewedAt: null, dismissedAt: null };
// A copy is not a published reply. Keep follow-ups until an owner reply is detected.
const replyWhere = {
  reviewedAt: { not: null },
  dismissedAt: null,
  replyText: { not: "" },
  comment: { hasOwnerReply: false },
};
const order = [{ createdAt: "asc" as const }, { id: "asc" as const }];
export type ReviewItem = {
  id: string;
  kind: ReviewKind;
  title: string;
  excerpt: string;
  state: string;
  href: string;
  createdAt: Date;
  warning?: string;
};

export async function reviewCounts() {
  const db = planningPrisma();
  const counts = await Promise.all([
    db.songRequest.count({ where: requestWhere }),
    db.musicPlanningDraft.count({ where: draftWhere }),
    db.commentReview.count({ where: commentWhere }),
    db.commentReview.count({ where: replyWhere }),
  ]);
  return Object.fromEntries(
    REVIEW_KINDS.map((kind, index) => [kind, counts[index]]),
  ) as Record<ReviewKind, number>;
}

export async function reviewItems(
  kind: ReviewKind,
  skip = 0,
  take = 21,
): Promise<ReviewItem[]> {
  const db = planningPrisma();
  if (kind === "requests")
    return (
      await db.songRequest.findMany({
        where: requestWhere,
        orderBy: order,
        skip,
        take,
      })
    ).map((r) => ({
      id: r.id,
      kind,
      title: r.title,
      excerpt: [r.artist, r.ideas].filter(Boolean).join(" · "),
      state:
        r.status === "NEEDS_INFO" ? "Needs information" : "Awaiting review",
      href: `/admin/requests/${encodeURIComponent(r.id)}`,
      createdAt: r.createdAt,
    }));
  if (kind === "drafts")
    return (
      await db.musicPlanningDraft.findMany({
        where: draftWhere,
        orderBy: order,
        skip,
        take,
        select: {
          id: true,
          sourceName: true,
          sourceText: true,
          createdAt: true,
        },
      })
    ).map((r) => ({
      id: r.id,
      kind,
      title: r.sourceName,
      excerpt: r.sourceText.slice(0, 240),
      state: "Saved draft · not adopted",
      href: `/admin/planning-drafts/${encodeURIComponent(r.id)}`,
      createdAt: r.createdAt,
    }));
  return (
    await db.commentReview.findMany({
      where: kind === "comments" ? commentWhere : replyWhere,
      orderBy: order,
      skip,
      take,
      include: { comment: true },
    })
  ).map((r) => ({
    id: r.id,
    kind,
    title: r.comment.authorDisplayName || "YouTube comment",
    excerpt: kind === "replies" ? r.replyText : r.sourceText,
    state:
      kind === "comments"
        ? "Recommendations need review"
        : !r.replyApprovedAt
          ? "Reply needs approval"
          : !r.copiedAt
            ? "Approved · ready to copy"
            : "Copied · verify reply on YouTube",
    href: `/admin/comment-reviews/${encodeURIComponent(r.id)}${kind === "replies" ? "#reply-review" : ""}`,
    createdAt: r.createdAt,
    warning:
      commentHash(r.comment) !== r.sourceHash
        ? "Source edited — analyze the current version before approval or copying."
        : r.comment.hasOwnerReply
          ? "Owner reply detected — no further reply needed."
          : !r.comment.ownerReplyCheckedAt
            ? "Owner reply status unknown — check YouTube first."
            : undefined,
  }));
}

export async function nextReviewPath(kind: ReviewKind, currentId: string) {
  const db = planningPrisma();
  const current =
    kind === "requests"
      ? await db.songRequest.findUnique({
          where: { id: currentId },
          select: { createdAt: true },
        })
      : kind === "drafts"
        ? await db.musicPlanningDraft.findUnique({
            where: { id: currentId },
            select: { createdAt: true },
          })
        : await db.commentReview.findUnique({
            where: { id: currentId },
            select: { createdAt: true },
          });
  if (!current) return "/admin/review";
  // Continue after this item even when saving leaves it in the pending queue.
  const afterCurrent = {
    OR: [
      { createdAt: { gt: current.createdAt } },
      { createdAt: current.createdAt, id: { gt: currentId } },
    ],
  };
  const row =
    kind === "requests"
      ? await db.songRequest.findFirst({
          where: { ...requestWhere, ...afterCurrent },
          orderBy: order,
          select: { id: true },
        })
      : kind === "drafts"
        ? await db.musicPlanningDraft.findFirst({
            where: { ...draftWhere, ...afterCurrent },
            orderBy: order,
            select: { id: true },
          })
        : await db.commentReview.findFirst({
            where: {
              ...(kind === "comments" ? commentWhere : replyWhere),
              ...afterCurrent,
            },
            orderBy: order,
            select: { id: true },
          });
  if (!row) return "/admin/review";
  const area =
    kind === "requests"
      ? "requests"
      : kind === "drafts"
        ? "planning-drafts"
        : "comment-reviews";
  return `/admin/${area}/${encodeURIComponent(row.id)}`;
}
