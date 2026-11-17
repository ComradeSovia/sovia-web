import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "../data/auth";
import { nextReviewPath } from "../data/review-inbox";
import {
  findRequestMatches,
  getSongRequest,
  listSongRequests,
  planningPrisma,
  REQUEST_STATUSES,
} from "../data/song-requests";
import { reviewedProposalsSchema } from "../model/planning-proposals";
import { planComparison, workComparison } from "../model/review-comparison";
import { detachRequestAction } from "../planning-actions";
import { AdminActionToast } from "./admin-action-toast";
import {
  AdminGate,
  Field,
  FieldStateGuide,
  SelectField,
  TextArea,
} from "./admin-content";
import { AdminConfirmForm } from "./admin-step-panels";
import { DuplicateComparison } from "./duplicate-comparison";
import {
  PlanningNavigation,
  PlanningWorkspace,
  ReviewBadge,
  ReviewDetails,
} from "./planning-workspace";
import workspace from "./planning-workspace.module.css";
import { CompareRequestToggle, RequestComparison } from "./request-comparison";
import { RequestDecision, RequestPlanSearch } from "./request-decision";
import { ReviewHistory } from "./review-history";

const panel = "space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5";
const link = "text-sky-300 underline underline-offset-4";
export function AdminRequestsPage({
  status,
  q,
  page,
}: {
  status?: string;
  q?: string;
  page: number;
}) {
  return (
    <AdminGate returnTo="/admin/requests">
      <RequestList status={status} q={q} page={page} />
    </AdminGate>
  );
}
async function RequestList({
  status,
  q,
  page,
}: {
  status?: string;
  q?: string;
  page: number;
}) {
  await requireAdminSession();
  const [requests, total] = await listSongRequests(status, q, page);
  const url = (nextPage: number) =>
    `/admin/requests?${new URLSearchParams({ status: status ?? "", q: q ?? "", page: String(nextPage) })}`;
  return (
    <section className="space-y-5">
      <PlanningNavigation active="requests" />
      <div className={panel}>
        <h1 className="text-3xl font-semibold">Song requests</h1>
        <p className="text-sm text-zinc-400">
          Choose the next song to produce. Compare the original suggestions,
          then open a request to preview and confirm your decision.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link className={link} href="/admin/review?kind=requests">
            Open decision queue
          </Link>
          <Link className={link} href="/admin/todo">
            Open production plans
          </Link>
        </div>
      </div>
      <form className="flex flex-wrap gap-3" method="get">
        <input
          aria-label="Search requests"
          className="min-w-0 rounded border border-zinc-700 bg-zinc-950 p-2"
          name="q"
          defaultValue={q}
          placeholder="Song, artist or original work"
        />
        <select
          aria-label="Review status"
          className="rounded border border-zinc-700 bg-zinc-950 p-2"
          name="status"
          defaultValue={status ?? ""}
        >
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button className="rounded border border-zinc-700 px-4" type="submit">
          Filter
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{total} requests</p>
        <div className="flex gap-4 text-sm">
          <Link className={link} href="/admin/requests?status=PENDING">
            Pending
          </Link>
          <Link className={link} href="/admin/requests?status=NEEDS_INFO">
            Needs information
          </Link>
          <Link className={link} href="/admin/requests">
            All records
          </Link>
        </div>
      </div>
      {requests.length > 0 && (
        <RequestComparison
          key={url(page)}
          candidates={requests.map(
            ({ id, title, artist, origin, ideas, channel, status, plans }) => ({
              id,
              title,
              artist,
              origin,
              ideas,
              channel,
              status,
              plans: plans.map(({ plan }) => ({
                id: plan.id,
                title: plan.title,
                status: plan.status,
              })),
            }),
          )}
        >
          {requests.map((request) => (
            <article className={workspace.queueRow} key={request.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  className={`${link} break-words font-medium`}
                  href={`/admin/requests/${encodeURIComponent(request.id)}`}
                >
                  {request.title}
                </Link>
                <ReviewBadge value={request.status} />
              </div>
              <p className="break-words text-sm text-zinc-400">
                {request.artist || "Unknown artist"} ·{" "}
                {request.origin || "Original work not supplied"}
              </p>
              {request.ideas ? (
                <p className="line-clamp-2 break-words text-sm leading-6 text-zinc-300">
                  {request.ideas}
                </p>
              ) : null}
              <p className="text-xs text-zinc-500">
                {request.channel} ·{" "}
                {request.createdAt.toISOString().slice(0, 10)} ·{" "}
                {request.plans.length} linked plans
              </p>
              {request.plans.map(({ plan }) => (
                <p key={plan.id} className="text-sm">
                  <Link
                    className={link}
                    href={`/admin/todo/${encodeURIComponent(plan.id)}`}
                  >
                    {plan.title} · {plan.status}
                    {plan.completedAt
                      ? ` · completed ${plan.completedAt.toISOString().slice(0, 10)}`
                      : ""}
                  </Link>
                </p>
              ))}
              <CompareRequestToggle id={request.id} title={request.title} />
            </article>
          ))}
        </RequestComparison>
      )}
      {!requests.length ? (
        <div className={panel}>
          <p className="text-zinc-400">No song requests match this view.</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {q || status ? (
              <Link className={link} href="/admin/requests">
                Clear filters
              </Link>
            ) : null}
            <Link
              className={link}
              href="/admin/planning-drafts?action=todo.analyze-proposals"
            >
              Review a pasted conversation
            </Link>
            <Link className={link} href="/admin/comment-reviews">
              Review comment suggestions
            </Link>
          </div>
        </div>
      ) : null}
      <nav className="flex gap-5" aria-label="Request pages">
        {page > 1 ? (
          <Link className={link} href={url(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page * 30 < total ? (
          <Link className={link} href={url(page + 1)}>
            Next
          </Link>
        ) : null}
      </nav>
    </section>
  );
}

export function AdminRequestDetailPage(props: {
  id: string;
  q?: string;
  selectedPlan?: string;
  status?: string;
  message?: string;
}) {
  return (
    <AdminGate returnTo={`/admin/requests/${encodeURIComponent(props.id)}`}>
      <RequestDetail {...props} />
    </AdminGate>
  );
}
async function RequestDetail({
  id,
  q,
  selectedPlan,
  status,
  message,
}: {
  id: string;
  q?: string;
  selectedPlan?: string;
  status?: string;
  message?: string;
}) {
  await requireAdminSession();
  const request = await getSongRequest(id);
  if (!request) notFound();
  const savedProposals = reviewedProposalsSchema.safeParse(
    request.sourceDraft?.proposals,
  );
  const sourceProposal = savedProposals.success
    ? savedProposals.data.find(
        (proposal) => proposal.key === request.sourceProposalKey,
      )
    : null;
  const query = typeof q === "string" ? q.trim().slice(0, 200) : "";
  const pinnedId =
    typeof selectedPlan === "string" && selectedPlan.length <= 300
      ? selectedPlan
      : "";
  const [[matches, works], choices, skipHref, pinned] = await Promise.all([
    findRequestMatches(request),
    planningPrisma().adminMusicTodo.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
    }),
    nextReviewPath("requests", id),
    pinnedId
      ? planningPrisma().adminMusicTodo.findUnique({ where: { id: pinnedId } })
      : null,
  ]);
  const plans = [
    ...new Map(
      [
        ...request.plans.map(({ plan }) => plan),
        ...matches,
        ...(pinned ? [pinned] : []),
        ...choices,
      ].map((plan) => [plan.id, plan]),
    ).values(),
  ].filter((plan) => plan.status !== "CANCELLED");
  const linkedIds = request.plans.map(({ planId }) => planId);
  return (
    <PlanningWorkspace active="requests" currentId={id}>
      <section className="space-y-5">
        <Link className={link} href="/admin/requests">
          ← Song requests
        </Link>
        <AdminActionToast
          status={status === "success" ? "success" : "error"}
          message={message}
        />
        <div className={workspace.columns}>
          <div className={workspace.source}>
            <div className={panel}>
              <h1 className="break-words text-3xl font-semibold">
                {request.title}
              </h1>
              <p className="text-sm text-zinc-400">
                {request.status} · {request.channel} ·{" "}
                {request.createdAt.toISOString()}
              </p>
              <dl className="grid gap-3 break-words text-sm">
                <div>
                  <dt className="text-zinc-500">Original artist</dt>
                  <dd>{request.artist || "Not supplied"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">
                    Original work / album / game
                  </dt>
                  <dd>{request.origin || "Not supplied"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Original adaptation ideas</dt>
                  <dd className="whitespace-pre-wrap">
                    {request.ideas || "Not supplied"}
                  </dd>
                </div>
              </dl>
              {request.sourceUrl ? (
                <a
                  className={`${link} break-all`}
                  href={request.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Original reference
                </a>
              ) : null}
              {request.legacyTodoId ? (
                <p className="text-xs text-amber-300">
                  Imported from the old contact form. Original work was not
                  captured; the original Todo and text have been preserved.
                </p>
              ) : null}
            </div>
            {request.commentSources.length ? (
              <div className={panel}>
                <h2 className="font-semibold">
                  Original YouTube comment sources
                </h2>
                {request.commentSources.map(({ review, proposalKey }) => (
                  <div
                    key={`${review.id}-${proposalKey}`}
                    className="space-y-2"
                  >
                    <Link
                      className={link}
                      href={`/admin/comment-reviews/${encodeURIComponent(review.id)}#quote-${proposalKey}-0`}
                    >
                      Comment review · source evidence and reply record
                    </Link>
                    <p>
                      <a
                        className={link}
                        href={review.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Original YouTube comment
                      </a>
                    </p>
                    <blockquote className="whitespace-pre-wrap break-words border-l-2 border-zinc-700 pl-3 text-sm text-zinc-400">
                      {review.sourceText}
                    </blockquote>
                  </div>
                ))}
              </div>
            ) : null}
            {request.sourceDraft ? (
              <div className={panel}>
                <h2 className="font-semibold">Original conversation source</h2>
                <Link
                  className={link}
                  href={`/admin/planning-drafts/${encodeURIComponent(request.sourceDraft.id)}#quote-${request.sourceProposalKey}-0`}
                >
                  {request.sourceDraft.sourceName} · locate original evidence
                </Link>
                {sourceProposal?.evidenceQuotes.map((quote) => (
                  <blockquote
                    key={quote}
                    className="whitespace-pre-wrap break-words border-l-2 border-zinc-600 pl-3 text-sm text-zinc-400"
                  >
                    {quote}
                  </blockquote>
                ))}
              </div>
            ) : null}
            {request.planningDrafts.length ? (
              <div className={panel}>
                <h2 className="font-semibold">AI planning drafts</h2>
                {request.planningDrafts.map((draft) => (
                  <p key={draft.id}>
                    <Link
                      className={link}
                      href={`/admin/planning-drafts/${encodeURIComponent(draft.id)}`}
                    >
                      {draft.sourceName} · {draft.status}
                    </Link>
                  </p>
                ))}
              </div>
            ) : null}
            <div className={panel}>
              <h2 className="font-semibold">Duplicate check</h2>
              <p className="text-xs text-zinc-400">
                Suggestions only. Check artist and adaptation direction before
                merging.
              </p>
              <DuplicateComparison
                incoming={{
                  title: request.title,
                  artist: request.artist,
                  origin: request.origin,
                  direction: request.ideas,
                }}
                candidates={[
                  ...matches.map(planComparison),
                  ...works.map(workComparison),
                ]}
                formId="request-review"
                mode="request"
              />
              <RequestPlanSearch id={id} query={query} count={choices.length} />
            </div>
            {request.plans.length ? (
              <div className={panel}>
                <h2 className="font-semibold">Linked plans</h2>
                {request.plans.map(({ plan }) => (
                  <div
                    className="flex flex-wrap items-center gap-4"
                    key={plan.id}
                  >
                    <Link
                      className={link}
                      href={`/admin/todo/${encodeURIComponent(plan.id)}`}
                    >
                      {plan.title} · {plan.status}
                    </Link>
                    <AdminConfirmForm
                      action={detachRequestAction}
                      title="Detach this plan?"
                      confirmLabel="Detach plan"
                      message={`Remove the link to “${plan.title}” from this recommendation?${request.plans.length === 1 ? " The recommendation will return to pending review." : ""}`}
                    >
                      <input type="hidden" name="requestId" value={id} />
                      <input type="hidden" name="planId" value={plan.id} />
                      <input
                        type="hidden"
                        name="updatedAt"
                        value={request.updatedAt.toISOString()}
                      />
                      <button
                        type="submit"
                        className="text-xs text-zinc-400 underline"
                      >
                        Detach incorrect link
                      </button>
                    </AdminConfirmForm>
                  </div>
                ))}
                <p className="text-xs text-zinc-500">
                  Detaching the last plan returns the request to pending review.
                  No original request or plan is deleted.
                </p>
              </div>
            ) : null}
          </div>
          <div className={workspace.editor}>
            <RequestDecision
              key={`${id}-${request.updatedAt.toISOString()}`}
              id={id}
              title={request.title}
              status={request.status}
              updatedAt={request.updatedAt.toISOString()}
              plans={plans.map((plan) => ({
                id: plan.id,
                title: plan.title,
                artist: plan.sourceArtists,
                status: plan.status,
                visible: plan.visible,
                updatedAt: plan.updatedAt.toISOString(),
              }))}
              linkedIds={linkedIds}
              skipHref={skipHref}
              notesField={
                <ReviewDetails title="Private review notes">
                  <TextArea
                    controlId="request-review-notes"
                    name="reviewNotes"
                    label="Private review notes"
                    value={request.reviewNotes}
                    rows={3}
                    maxLength={4000}
                  />
                </ReviewDetails>
              }
              targetField={
                <SelectField
                  controlId="request-plan-target"
                  label="Existing production plan"
                  name="planId"
                  value={
                    linkedIds.find((planId) =>
                      plans.some((plan) => plan.id === planId),
                    ) ?? ""
                  }
                  placeholder="Choose a plan"
                  required
                  options={plans.map((plan) => ({
                    label: `${plan.title} · ${plan.sourceArtists || "Unknown artist"} · ${plan.id}`,
                    value: plan.id,
                  }))}
                />
              }
              planFields={
                <div className="space-y-3">
                  <Field
                    controlId="request-plan-title"
                    label="Plan song title"
                    name="title"
                    value={request.title}
                    maxLength={300}
                    required
                  />
                  <ReviewDetails title="Artist, source and production direction">
                    <Field
                      controlId="request-plan-origin"
                      label="Original work / album / game"
                      name="from"
                      value={request.origin}
                      maxLength={500}
                    />
                    <Field
                      controlId="request-plan-artists"
                      label="Source artists"
                      name="sourceArtists"
                      value={request.artist}
                      maxLength={1000}
                    />
                    <Field
                      controlId="request-plan-url"
                      label="Reference URL"
                      name="sourceUrl"
                      value={request.sourceUrl}
                      maxLength={2000}
                      type="url"
                    />
                    <TextArea
                      controlId="request-plan-notes"
                      label="Production direction / notes"
                      name="notes"
                      value={request.ideas}
                      rows={5}
                      maxLength={4000}
                    />
                  </ReviewDetails>
                  <ReviewDetails title="Field state guide">
                    <FieldStateGuide />
                  </ReviewDetails>
                </div>
              }
            />
            <aside className={panel}>
              <details open>
                <summary className="cursor-pointer font-semibold">
                  AI planning assistant
                </summary>
                <p className="mt-4 text-xs leading-6 text-zinc-400">
                  Generate a temporary preview from this original request. Fill
                  the current form without saving, or save a private draft for
                  duplicate checks and source tracking.
                </p>
                <div className="mt-4 grid gap-4">
                  <Link
                    className={link}
                    href={`/admin/requests/${encodeURIComponent(id)}?action=todo.organize-request&request=${encodeURIComponent(id)}`}
                  >
                    Organize this request with AI
                  </Link>
                  <Link
                    className={link}
                    href={`/admin/planning-drafts?request=${encodeURIComponent(id)}`}
                  >
                    Saved drafts for this request
                  </Link>
                </div>
              </details>
            </aside>
          </div>
        </div>
        <ReviewHistory type="REQUEST" id={id} compact />
      </section>
    </PlanningWorkspace>
  );
}
