import Link from "next/link";
import { notFound } from "next/navigation";
import {
  approveCommentReviewAction,
  approveSavedReplyAction,
  dismissCommentReviewAction,
  refreshCommentReplyAction,
  saveCommentReviewAction,
  saveReviewedReplyAction,
} from "../comment-review-actions";
import { requireAdminSession } from "../data/auth";
import { commentHash } from "../data/comment-source";
import { findRequestMatches, planningPrisma } from "../data/song-requests";
import { commentProposalsSchema } from "../model/comment-review";
import { normalizeSongKey, sourceEvidence } from "../model/planning-proposals";
import { planComparison, workComparison } from "../model/review-comparison";
import {
  AdminGate,
  Field,
  FieldStateGuide,
  SelectField,
  TextArea,
} from "./admin-content";
import { AdminDirtyForm } from "./admin-step-panels";
import { CommentReplyCopy } from "./comment-reply-copy";
import { DuplicateComparison } from "./duplicate-comparison";
import { PlanningAdoptForm } from "./planning-adopt-form";
import { PlanningSource } from "./planning-source";
import { PlanningSubmit } from "./planning-submit";
import {
  PlanningNavigation,
  PlanningWorkspace,
  ProposalPreview,
  ReviewBadge,
  ReviewDetails,
} from "./planning-workspace";
import workspace from "./planning-workspace.module.css";
import { ReviewHistory } from "./review-history";

const panel = "space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5";
const link = "text-sky-300 underline underline-offset-4";
export function AdminCommentReviewsPage({ page }: { page: number }) {
  return (
    <AdminGate returnTo="/admin/comment-reviews">
      <ReviewList page={page} />
    </AdminGate>
  );
}
async function ReviewList({ page }: { page: number }) {
  await requireAdminSession();
  const items = await planningPrisma().commentReview.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * 30,
    take: 31,
    include: { comment: true, _count: { select: { requests: true } } },
  });
  return (
    <section className="space-y-5">
      <PlanningNavigation active="comment-reviews" />
      <div className={panel}>
        <h1 className="text-3xl font-semibold">Comment reviews</h1>
        <p className="text-sm text-zinc-400">
          Private AI recommendations and reply drafts. Approving creates pending
          song recommendations, or merges their source into an existing
          recommendation. Replies are reviewed for copying; nothing is posted
          automatically.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link
            className={link}
            href="/admin/comment-reviews?action=comments.analyze"
          >
            Analyze next unanswered comments
          </Link>
          <Link className={link} href="/admin/comments">
            Comment inbox
          </Link>
          <Link className={link} href="/admin/requests">
            Song recommendations
          </Link>
        </div>
      </div>
      {items.slice(0, 30).map((item) => (
        <article className={workspace.queueRow} key={item.id}>
          <Link
            className={link}
            href={`/admin/comment-reviews/${encodeURIComponent(item.id)}`}
          >
            {item.comment.authorDisplayName} · {item.sourceText.slice(0, 100)}
          </Link>
          <p className="text-xs text-zinc-400">
            {item.dismissedAt
              ? "Dismissed"
              : item.reviewedAt
                ? "Reviewed"
                : "Draft"}{" "}
            · {item._count.requests} linked recommendations ·{" "}
            {item.replyApprovedAt
              ? "Reply approved for copy"
              : "Reply not approved"}{" "}
            ·{" "}
            {item.comment.hasOwnerReply
              ? "Owner reply detected on YouTube"
              : "Last check: no owner reply"}
            {commentHash(item.comment) !== item.sourceHash
              ? " · Source edited — re-analysis required"
              : ""}
          </p>
        </article>
      ))}
      {!items.length ? (
        <p className="text-zinc-400">
          No saved comment reviews yet. Generate a preview from the inbox, then
          explicitly save it here.
        </p>
      ) : null}
      <nav className="flex gap-5">
        {page > 1 ? (
          <Link
            className={link}
            href={`/admin/comment-reviews?page=${page - 1}`}
          >
            Previous
          </Link>
        ) : null}
        {items.length > 30 ? (
          <Link
            className={link}
            href={`/admin/comment-reviews?page=${page + 1}`}
          >
            Next
          </Link>
        ) : null}
      </nav>
    </section>
  );
}
export function AdminCommentReviewPage(props: {
  id: string;
  message?: string;
  status?: string;
}) {
  return (
    <AdminGate
      returnTo={`/admin/comment-reviews/${encodeURIComponent(props.id)}`}
    >
      <ReviewDetail {...props} />
    </AdminGate>
  );
}
async function ReviewDetail({
  id,
  message,
  status,
}: {
  id: string;
  message?: string;
  status?: string;
}) {
  await requireAdminSession();
  const db = planningPrisma();
  const review = await db.commentReview.findUnique({
    where: { id },
    include: {
      comment: true,
      requests: {
        include: {
          request: {
            include: {
              plans: {
                include: {
                  plan: { select: { id: true, title: true, status: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!review) notFound();
  const proposals = commentProposalsSchema.parse(review.proposals);
  const requests = await db.songRequest.findMany({
    where: { status: { notIn: ["REJECTED", "ARCHIVED"] } },
    select: {
      id: true,
      title: true,
      artist: true,
      status: true,
      origin: true,
      ideas: true,
      plans: { include: { plan: { select: { title: true, status: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const matches = await Promise.all(
    proposals.map((p) =>
      findRequestMatches({ title: p.title, sourceUrl: p.sourceUrl || null }),
    ),
  );
  const stale = commentHash(review.comment) !== review.sourceHash;
  const editable = !review.reviewedAt && !review.dismissedAt;
  return (
    <PlanningWorkspace active="comment-reviews" currentId={id}>
      <section className="space-y-5">
        <Link className={link} href="/admin/comment-reviews">
          ← Comment reviews
        </Link>
        {message ? (
          <output
            className={
              status === "success" ? "text-emerald-300" : "text-amber-300"
            }
          >
            {message}
          </output>
        ) : null}
        <div className={workspace.columns}>
          <div className={workspace.source}>
            <div className={panel}>
              <h1 className="break-words text-3xl font-semibold">
                Comment by {review.comment.authorDisplayName}
              </h1>
              <p className="text-xs text-zinc-400">
                {review.dismissedAt
                  ? "Dismissed"
                  : review.reviewedAt
                    ? "Reviewed"
                    : "Draft"}{" "}
                · version {review.version} · {review.model} ·{" "}
                {review.createdAt.toISOString()}
              </p>
              <div className="flex flex-wrap gap-5">
                <a
                  className={link}
                  href={review.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Original YouTube comment / reply there
                </a>
                <Link
                  className={link}
                  href={`/admin/content/${encodeURIComponent(review.comment.contentId)}?step=youtube`}
                >
                  Video Work record
                </Link>
                <Link
                  className={link}
                  href={`/admin/comments?action=comments.analyze&comment=${encodeURIComponent(review.commentId)}`}
                >
                  Analyze current comment version
                </Link>
              </div>
              <p className="text-sm text-zinc-400">
                {review.comment.hasOwnerReply
                  ? "Owner reply detected — do not reply again."
                  : "Last successful check found no owner reply."}{" "}
                Checked:{" "}
                {review.comment.ownerReplyCheckedAt?.toISOString() || "Unknown"}
                . Approval and copy always check live again. Copying never marks
                a comment as replied.
              </p>
              {stale ? (
                <p className="text-amber-300">
                  The original comment has been edited. This snapshot is
                  retained for traceability; generate and review its new version
                  before further processing.
                </p>
              ) : null}
              <form action={refreshCommentReplyAction}>
                <input type="hidden" name="reviewId" value={id} />
                <PlanningSubmit>Refresh live reply status</PlanningSubmit>
              </form>
            </div>
            <div className={panel}>
              <h2 className="font-semibold">
                Immutable source · highlighted evidence
              </h2>
              <PlanningSource
                source={review.sourceText}
                proposals={proposals}
              />
              <p className="whitespace-pre-wrap text-sm text-zinc-400">
                {review.rationale}
              </p>
            </div>
          </div>
          <div className={workspace.editor}>
            {editable ? (
              <>
                <AdminDirtyForm
                  action={saveCommentReviewAction}
                  id="comment-review"
                  key={review.version}
                  className="space-y-5"
                >
                  <input type="hidden" name="reviewId" value={id} />
                  <input type="hidden" name="version" value={review.version} />
                  <div className={panel}>
                    <h2 className="font-semibold">
                      Review song recommendations
                    </h2>
                    <ReviewDetails title="Field state guide">
                      <FieldStateGuide />
                    </ReviewDetails>
                    <p className="text-xs text-zinc-400">
                      Save edits first. No recommendations are created while
                      this remains a draft. Existing plans and Works are
                      suggestions to check; accepting a new recommendation does
                      not create a production plan.
                    </p>
                    {!proposals.length ? (
                      <p>
                        No concrete song recommendations found. You can still
                        review the reply or dismiss this comment.
                      </p>
                    ) : null}
                  </div>
                  {proposals.map((p, index) => {
                    const requestMatches = requests
                      .filter(
                        (r) =>
                          normalizeSongKey(r.title).includes(
                            normalizeSongKey(p.title),
                          ) ||
                          normalizeSongKey(p.title).includes(
                            normalizeSongKey(r.title),
                          ),
                      )
                      .slice(0, 10);
                    const [plans, works] = matches[index];
                    return (
                      <article className={panel} key={p.key}>
                        <div className="flex items-center justify-between gap-3 font-semibold">
                          <span>
                            {index + 1}. {p.title}
                          </span>
                          <ReviewBadge value={p.decision} />
                        </div>
                        <ProposalPreview
                          title={p.title}
                          artist={p.sourceArtists}
                          notes={p.notes}
                          missing={p.missingInfo}
                        />
                        <ReviewDetails title="Source excerpts">
                          {sourceEvidence(
                            review.sourceText,
                            p.evidenceQuotes,
                          ).map((e, i) => (
                            <div key={`${i}-${e.start}`}>
                              <blockquote className="whitespace-pre-wrap border-l-2 border-zinc-600 pl-3 text-sm">
                                {e.quote}
                              </blockquote>
                              <a className={link} href={`#quote-${p.key}-${i}`}>
                                Locate source [{e.start}–{e.end}]
                              </a>
                            </div>
                          ))}
                        </ReviewDetails>
                        <DuplicateComparison
                          incoming={{
                            title: p.title,
                            artist: p.sourceArtists,
                            origin: p.from,
                            direction: p.notes,
                          }}
                          candidates={[
                            ...requestMatches.map((r) => ({
                              id: r.id,
                              kind: "request" as const,
                              title: r.title,
                              artist: r.artist,
                              origin: r.origin,
                              direction: r.ideas,
                              status: r.status,
                              href: `/admin/requests/${encodeURIComponent(r.id)}`,
                              workSummary: r.plans.length
                                ? r.plans
                                    .map(
                                      (l) =>
                                        `${l.plan.title} · ${l.plan.status}`,
                                    )
                                    .join(", ")
                                : "No linked plans",
                            })),
                            ...plans.map(planComparison),
                            ...works.map(workComparison),
                          ]}
                          formId="comment-review"
                          mode="comment"
                          proposalKey={p.key}
                        />
                        <SelectField
                          label="Recommendation choice"
                          name={`decision-${p.key}`}
                          value={p.decision}
                          options={[
                            {
                              value: "create",
                              label: "Create a pending song recommendation",
                            },
                            {
                              value: "attach",
                              label:
                                "Merge source into an existing recommendation",
                            },
                            {
                              value: "skip",
                              label: "Ignore this recommendation",
                            },
                          ]}
                        />
                        <SelectField
                          label="Existing recommendation (merge only)"
                          name={`target-${p.key}`}
                          value={p.target}
                          options={[
                            { value: "", label: "No target selected" },
                            ...requests.map((r) => ({
                              value: r.id,
                              label: `${r.title} · ${r.artist || "Unknown artist"} · ${r.status} · ${r.id}`,
                            })),
                          ]}
                        />
                        <ReviewDetails title="Edit song details and duplicate override">
                          <SelectField
                            label="Distinct adaptation override (new recommendations only)"
                            name={`allowDuplicate-${p.key}`}
                            value={String(p.allowDuplicate)}
                            options={[
                              {
                                value: "false",
                                label:
                                  "Stop if the same song already has a recommendation",
                              },
                              {
                                value: "true",
                                label:
                                  "I reviewed matches: keep a distinct adaptation",
                              },
                            ]}
                          />
                          <Field
                            label="Song title"
                            name={`title-${p.key}`}
                            value={p.title}
                            maxLength={300}
                            required
                          />
                          <Field
                            label="Original work / album / game"
                            name={`from-${p.key}`}
                            value={p.from}
                            maxLength={500}
                          />
                          <Field
                            label="Source artists"
                            name={`sourceArtists-${p.key}`}
                            value={p.sourceArtists}
                            maxLength={1000}
                          />
                          <Field
                            label="Song reference URL"
                            name={`sourceUrl-${p.key}`}
                            value={p.sourceUrl}
                            maxLength={2000}
                            type="url"
                          />
                          <TextArea
                            label="Audience requirements"
                            name={`requestedChanges-${p.key}`}
                            value={p.requestedChanges}
                            maxLength={800}
                            rows={3}
                          />
                          <TextArea
                            label="AI production direction / your notes"
                            name={`notes-${p.key}`}
                            value={p.notes}
                            maxLength={2000}
                            rows={4}
                          />
                          <TextArea
                            label="Missing information"
                            name={`missingInfo-${p.key}`}
                            value={p.missingInfo}
                            maxLength={800}
                            rows={2}
                          />
                          <TextArea
                            label="Possible public introduction (private draft)"
                            name={`publicSummary-${p.key}`}
                            value={p.publicSummary}
                            maxLength={2000}
                            rows={2}
                          />
                        </ReviewDetails>
                      </article>
                    );
                  })}
                  <div className={panel}>
                    <h2 id="reply-review" className="scroll-mt-8 font-semibold">
                      Reply draft — not sent
                    </h2>
                    <TextArea
                      label="Your reply text"
                      hideCopy
                      name="replyText"
                      value={review.replyText}
                      maxLength={4000}
                      rows={5}
                    />
                    <p className="text-xs text-zinc-400">
                      Check language, tone, factual claims and any manually
                      added links. Avoid promises you do not intend to make.
                    </p>
                  </div>
                  <div className={workspace.saveBar}>
                    <PlanningSubmit>
                      Save review edits — no recommendations or replies sent
                    </PlanningSubmit>
                    <PlanningSubmit next>
                      Save and view next comment
                    </PlanningSubmit>
                  </div>
                </AdminDirtyForm>
                <div className={panel}>
                  <h2 className="font-semibold">Approve saved review</h2>
                  <PlanningAdoptForm
                    action={approveCommentReviewAction}
                    nextLabel="Approve and view next comment"
                    confirmation="I reviewed the saved song recommendations, source evidence, duplicate choices and reply draft. Create or merge only my selected recommendations."
                    buttonLabel="Check replies and approve saved review"
                  >
                    <input type="hidden" name="reviewId" value={id} />
                    <input
                      type="hidden"
                      name="version"
                      value={review.version}
                    />
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        name="approveReply"
                        className="mt-1 size-4"
                      />
                      Also approve this reply draft for copying (nothing will be
                      posted).
                    </label>
                  </PlanningAdoptForm>
                </div>
                <div className={panel}>
                  <h2 className="font-semibold">Dismiss without importing</h2>
                  <PlanningAdoptForm
                    action={dismissCommentReviewAction}
                    confirmation="I reviewed this comment and want to skip it. Keep the source record and prevent repeated processing of this version."
                    buttonLabel="Dismiss reviewed comment"
                  >
                    <input type="hidden" name="reviewId" value={id} />
                    <input
                      type="hidden"
                      name="version"
                      value={review.version}
                    />
                  </PlanningAdoptForm>
                </div>
              </>
            ) : (
              <>
                <div className={panel}>
                  <h2 className="font-semibold">Review record</h2>
                  {review.requests.map(({ request, proposalKey }) => (
                    <div key={proposalKey} className="space-y-2">
                      <Link
                        className={link}
                        href={`/admin/requests/${encodeURIComponent(request.id)}`}
                      >
                        {request.title} · {request.status}
                      </Link>
                      {request.plans.map(({ plan }) => (
                        <p key={plan.id}>
                          <Link
                            className={link}
                            href={`/admin/todo/${encodeURIComponent(plan.id)}`}
                          >
                            Production plan: {plan.title} · {plan.status}
                          </Link>
                        </p>
                      ))}
                    </div>
                  ))}
                  {!review.requests.length ? (
                    <p>No song recommendations imported.</p>
                  ) : null}
                  {proposals.map((p) => (
                    <details
                      className="space-y-2 border-t border-zinc-800 pt-3 text-sm"
                      key={p.key}
                    >
                      <summary>
                        {p.title} · {p.decision}
                      </summary>
                      <p className="whitespace-pre-wrap">
                        Audience request: {p.requestedChanges}
                      </p>
                      <p className="whitespace-pre-wrap">
                        Production direction: {p.notes}
                      </p>
                      <p>Needs confirmation: {p.missingInfo}</p>
                    </details>
                  ))}
                </div>
                <div className={panel}>
                  <h2 id="reply-review" className="scroll-mt-8 font-semibold">
                    {review.replyApprovedAt
                      ? "Approved reply draft"
                      : "Reply not approved"}
                  </h2>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {review.replyText || "No reply suggested."}
                  </p>
                  {review.replyApprovedAt ? <CommentReplyCopy id={id} /> : null}
                  {!review.dismissedAt ? (
                    <>
                      <AdminDirtyForm
                        action={saveReviewedReplyAction}
                        key={`reply-${review.version}`}
                        className="space-y-4"
                      >
                        <input type="hidden" name="reviewId" value={id} />
                        <input
                          type="hidden"
                          name="version"
                          value={review.version}
                        />
                        <TextArea
                          label="Revise reply (saving removes its approval)"
                          name="replyText"
                          value={review.replyText}
                          maxLength={4000}
                          rows={4}
                          hideCopy
                        />
                        <PlanningSubmit>
                          Save revised reply — no message sent
                        </PlanningSubmit>
                        <PlanningSubmit next>
                          Save and view next reply
                        </PlanningSubmit>
                      </AdminDirtyForm>
                      {!review.replyApprovedAt ? (
                        <PlanningAdoptForm
                          action={approveSavedReplyAction}
                          nextLabel="Approve and view next reply"
                          confirmation="I reviewed this saved reply wording. Check YouTube again and approve it for copying only."
                          buttonLabel="Check replies and approve saved reply"
                        >
                          <input type="hidden" name="reviewId" value={id} />
                          <input
                            type="hidden"
                            name="version"
                            value={review.version}
                          />
                        </PlanningAdoptForm>
                      ) : null}
                    </>
                  ) : null}
                  <p className="text-xs text-zinc-400">
                    {review.copiedAt
                      ? `Copy requested at ${review.copiedAt.toISOString()}. This is not proof of a published reply.`
                      : "No copy recorded."}{" "}
                    Only a fresh YouTube check can confirm you have replied.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <ReviewHistory type="COMMENT" id={id} compact />
      </section>
    </PlanningWorkspace>
  );
}
