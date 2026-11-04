"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AdminActionViewProps } from "../actions/views";
import { commentBatchSchema } from "../model/comment-review";
export function AdminCommentReviewPreview({
  action,
  busy,
  execute,
  renderInput,
  run,
  saveOutput,
}: AdminActionViewProps) {
  const parsed = commentBatchSchema.safeParse(run.output);
  const batch = parsed.success ? parsed.data : null;
  return (
    <div className="space-y-4">
      {action.inputs.map(renderInput)}
      <p className="text-xs leading-6 text-zinc-400">
        Checks YouTube replies live. Already replied, own comments, and saved
        source versions are skipped. Failed checks remain unknown. Up to 5
        comments per run; batch mode selects the next unprocessed cached
        comments. Sync comments first for newer data. Generation and draft
        saving do not create recommendations or send replies.
      </p>
      {run.error ? (
        <p role="alert" className="text-sm text-red-300">
          {run.error}
        </p>
      ) : null}
      <Button type="button" disabled={busy} onClick={execute}>
        {busy
          ? "Working…"
          : batch
            ? "Generate another preview"
            : "Check replies and generate preview"}
      </Button>
      {batch ? (
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          <p>
            {batch.items.length} reviews ready · {batch.skipped.length} skipped
          </p>
          {batch.items.map((item) => (
            <article
              key={item.commentId}
              className="space-y-3 rounded border border-zinc-700 p-3 text-sm"
            >
              <a
                className="text-sky-300 underline"
                href={item.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                Original YouTube comment
              </a>
              <blockquote className="whitespace-pre-wrap break-words border-l-2 border-zinc-600 pl-3">
                {item.sourceText}
              </blockquote>
              <p className="text-xs text-zinc-400">
                No owner reply found · checked {item.ownerReplyCheckedAt}
              </p>
              <p>{item.rationale}</p>
              {item.proposals.map((p) => (
                <div key={p.key} className="space-y-1">
                  <h3 className="font-semibold">
                    {p.title} · {p.sourceArtists || "Unknown artist"}
                  </h3>
                  <p>
                    Audience request: {p.requestedChanges || "None specified"}
                  </p>
                  <p>Production suggestion: {p.notes}</p>
                  {p.missingInfo ? (
                    <p className="text-amber-300">
                      Needs confirmation: {p.missingInfo}
                    </p>
                  ) : null}
                  {p.evidenceQuotes.map((quote, i) => (
                    <blockquote
                      key={`${i}-${quote}`}
                      className="border-l border-zinc-700 pl-2 text-xs text-zinc-400"
                    >
                      {quote}
                    </blockquote>
                  ))}
                </div>
              ))}
              {!item.proposals.length ? (
                <p className="text-zinc-400">
                  No concrete song recommendation found.
                </p>
              ) : null}
              <p className="whitespace-pre-wrap">
                <strong>Reply draft:</strong>{" "}
                {item.replyText || "No reply suggested."}
              </p>
            </article>
          ))}
          {batch.skipped.length ? (
            <details className="space-y-2 text-xs text-zinc-400">
              <summary>Skipped / failed checks</summary>
              {batch.skipped.map((item, i) => (
                <p key={`${i}-${item.commentId}`}>
                  {item.commentId}: {item.reason}{" "}
                  {item.reviewId ? (
                    <Link
                      className="text-sky-300 underline"
                      href={`/admin/comment-reviews/${encodeURIComponent(item.reviewId)}`}
                    >
                      Open existing review
                    </Link>
                  ) : null}
                </p>
              ))}
            </details>
          ) : null}
          {batch.items.length ? (
            <Button type="button" disabled={busy} onClick={saveOutput}>
              Save private reviews — no recommendations or replies sent
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
