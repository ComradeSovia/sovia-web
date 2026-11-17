import { ExternalLink, MessageCircle, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { linkCommentRequestAction } from "../comment-review-actions";
import { commentHash } from "../data/comment-source";
import { planningPrisma } from "../data/song-requests";
import type { listAdminYoutubeComments } from "../data/youtube-comments";
import {
  MANUAL_SOURCE_MODEL,
  youtubeCommentUrl,
} from "../model/comment-review";
import {
  adviceLabel,
  categoryLabel,
  replyStatusLabel,
} from "../model/comment-triage-labels";
import { CommentTriageEditor } from "./comment-triage";
import { PlanningAdoptForm } from "./planning-adopt-form";

type Row = Awaited<
  ReturnType<typeof listAdminYoutubeComments>
>["items"][number];
const link = "text-sky-300 hover:underline";

export function AdminCommentsTable({
  comments,
  focusedId,
  returnTo,
  ownChannelId,
}: {
  comments: Row[];
  focusedId?: string;
  returnTo: string;
  ownChannelId?: string | null;
}) {
  return (
    <div className="grid gap-3">
      {comments.map((comment) => {
        const current = comment.reviews.find(
          (review) => review.id === comment.currentReviewId,
        );
        const latest = comment.reviews[0];
        const linked = new Map(
          comment.reviews.flatMap((review) =>
            review.requests.map(
              ({ request }) => [request.id, request] as const,
            ),
          ),
        );
        const own =
          comment.authorChannelId != null
            ? comment.authorChannelId === ownChannelId
            : /^@?comradesovia$/i.test(comment.authorDisplayName.trim());
        const analysisHref = `/admin/comments?action=comments.analyze&comment=${encodeURIComponent(comment.id)}`;
        return (
          <article
            id={`comment-${comment.id}`}
            key={comment.id}
            className="min-w-0 scroll-mt-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4"
          >
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <strong className="break-all text-sm text-zinc-200">
                {comment.authorDisplayName}
                {own ? " · You" : ""}
              </strong>
              <time
                className="text-zinc-400"
                dateTime={comment.publishedAt.toISOString()}
              >
                {comment.publishedAt.toISOString().slice(0, 10)}
              </time>
              <span
                className={
                  comment.effectiveCategory === "SONG_REQUEST"
                    ? "rounded bg-sky-950 px-2 py-1 text-sky-200"
                    : "text-zinc-400"
                }
              >
                {categoryLabel[comment.effectiveCategory]}
              </span>
              <span className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">
                {replyStatusLabel[comment.replyStatus]}
                {!comment.ownerReplyCheckedAt &&
                comment.replyStatus === "UNREPLIED"
                  ? " · unverified"
                  : ""}
              </span>
            </header>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-100">
              {comment.text}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              <Link
                href={`/admin/content/${encodeURIComponent(comment.contentId)}?step=youtube`}
                className="max-w-full truncate hover:underline"
              >
                {comment.work.content?.songTitle || comment.contentId}
              </Link>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp size={13} aria-label="Likes" />
                {comment.likeCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle size={13} aria-label="Replies" />
                {comment.replyCount}
              </span>
              <a
                className={`inline-flex items-center gap-1 ${link}`}
                href={youtubeCommentUrl(comment)}
                rel="noreferrer"
                target="_blank"
              >
                YouTube <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>
            {!comment.ownerReplyCheckedAt && (
              <p className="text-xs text-amber-300">
                Owner reply status has not been checked on YouTube.
              </p>
            )}
            {current && current.model !== MANUAL_SOURCE_MODEL && (
              <p className="text-xs text-zinc-400">
                AI advice · {adviceLabel[current.replyAdvice]}
              </p>
            )}
            {linked.size > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {[...linked.values()].map((req) => (
                  <Link
                    className={link}
                    key={req.id}
                    href={`/admin/requests/${encodeURIComponent(req.id)}`}
                  >
                    Song request · {req.title}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {current && (
                <Link
                  className={link}
                  href={`/admin/comment-reviews/${encodeURIComponent(current.id)}`}
                >
                  {current.model === MANUAL_SOURCE_MODEL &&
                  !current.dismissedAt &&
                  !current.reviewedAt
                    ? "View linked source"
                    : current.dismissedAt
                      ? "View dismissed review"
                      : current.reviewedAt
                        ? "View reviewed comment"
                        : "Review saved draft"}
                </Link>
              )}
              {!own &&
                (!current ||
                  (current.model === MANUAL_SOURCE_MODEL &&
                    !current.dismissedAt &&
                    !current.reviewedAt)) && (
                  <Link className={link} href={analysisHref}>
                    {comment.effectiveCategory === "SONG_REQUEST"
                      ? "Review song request with AI"
                      : "Classify with AI"}
                  </Link>
                )}
              {latest && !current && (
                <Link
                  className={link}
                  href={`/admin/comment-reviews/${encodeURIComponent(latest.id)}`}
                >
                  Previous source version
                </Link>
              )}
              {comment.replyStatus === "DRAFTED" && current && (
                <Link
                  className={link}
                  href={`/admin/comment-reviews/${encodeURIComponent(current.id)}#reply-review`}
                >
                  Open reply draft
                </Link>
              )}
              {!own && focusedId !== comment.id && (
                <Link
                  className={link}
                  href={`/admin/comments?commentId=${encodeURIComponent(comment.id)}#link-request`}
                >
                  Link a song request
                </Link>
              )}
            </div>
            <CommentTriageEditor
              comment={comment}
              sourceHash={commentHash(comment)}
              returnTo={returnTo}
            />
            {focusedId === comment.id && (
              <Link
                className={`text-xs ${link}`}
                href={`/admin/review/history?type=YOUTUBE_COMMENT&id=${encodeURIComponent(comment.id)}`}
              >
                Comment decision history
              </Link>
            )}
            {!own && focusedId === comment.id && (
              <RequestLinkForm
                comment={comment}
                linkedIds={[...linked.keys()]}
              />
            )}
          </article>
        );
      })}
      {!comments.length && (
        <p className="rounded-md border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-400">
          No comments match these filters.
        </p>
      )}
    </div>
  );
}

async function RequestLinkForm({
  comment,
  linkedIds,
}: {
  comment: Row;
  linkedIds: string[];
}) {
  const requests = await planningPrisma().songRequest.findMany({
    where: {
      status: { notIn: ["ARCHIVED", "REJECTED"] },
      id: { notIn: linkedIds },
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: { id: true, title: true, artist: true, status: true },
  });
  return (
    <section
      className="space-y-3 rounded-md border border-zinc-800 p-3 text-sm"
      id="link-request"
    >
      <h3 className="font-semibold">Link an existing song request</h3>
      {requests.length ? (
        <PlanningAdoptForm
          action={linkCommentRequestAction}
          confirmation="I reviewed this comment and the selected song request."
          buttonLabel="Link comment to song request"
        >
          <input type="hidden" name="commentId" value={comment.id} />
          <input type="hidden" name="sourceHash" value={commentHash(comment)} />
          <input
            type="hidden"
            name="triageVersion"
            value={comment.triageVersion}
          />
          <label className="grid gap-2">
            Song request
            <select
              required
              name="requestId"
              defaultValue=""
              className="max-w-full rounded-md border border-zinc-700 bg-zinc-950 p-2"
            >
              <option value="">Select a song request</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} · {r.artist || "Unknown artist"} · {r.status}
                </option>
              ))}
            </select>
          </label>
        </PlanningAdoptForm>
      ) : (
        <p className="text-zinc-400">
          No other active song requests available.
        </p>
      )}
    </section>
  );
}
