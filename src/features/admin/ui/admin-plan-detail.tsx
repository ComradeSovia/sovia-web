import { getDefaultSharedCopy } from "@sovia/shared/i18n/copy";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "../data/auth";
import {
  PLAN_STATUSES,
  planningPrisma,
  WORK_MATCHES,
} from "../data/song-requests";
import {
  linkWorkAction,
  savePlanAction,
  unlinkWorkAction,
} from "../planning-actions";
import { AdminActionToast } from "./admin-action-toast";
import {
  AdminGate,
  Field,
  FieldStateGuide,
  SelectField,
  TextArea,
} from "./admin-content";
import { AdminPlanPreview, PlanSaveButton } from "./admin-plan-preview";
import { AdminDirtyForm } from "./admin-step-panels";
import { PlanningSubmit } from "./planning-submit";
import { PlanningWorkspace, ReviewDetails } from "./planning-workspace";
import workspace from "./planning-workspace.module.css";
import { ReviewHistory } from "./review-history";

const panel = "space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5";
const linkClass = "text-sky-300 underline underline-offset-4";
const matchOptions = WORK_MATCHES.map((value) => ({
  value,
  label: {
    FULL: "Fully satisfies this plan",
    PARTIAL: "Partially satisfies this plan",
    RELATED: "Related version only",
  }[value],
}));

export function AdminPlanDetailPage(props: {
  id: string;
  q?: string;
  status?: string;
  message?: string;
}) {
  return (
    <AdminGate returnTo={`/admin/todo/${encodeURIComponent(props.id)}`}>
      <PlanDetail {...props} />
    </AdminGate>
  );
}
async function PlanDetail({
  id,
  q,
  status,
  message,
}: {
  id: string;
  q?: string;
  status?: string;
  message?: string;
}) {
  await requireAdminSession();
  const prisma = planningPrisma();
  const plan = await prisma.adminMusicTodo.findUnique({
    where: { id },
    include: {
      requests: { include: { request: true } },
      _count: { select: { votes: { where: { active: true } } } },
      planningDrafts: {
        include: { draft: { select: { id: true, sourceName: true } } },
      },
      works: {
        include: {
          work: {
            include: {
              content: true,
              status: true,
              platforms: { select: { platform: true, platformId: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!plan) notFound();
  const works = await prisma.musicWork.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { contentId: { contains: q, mode: "insensitive" } },
              { content: { songTitle: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      musicPlans: { none: { planId: id } },
    },
    include: { content: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
  const recent = await prisma.musicPlanVote.count({
    where: {
      planId: id,
      active: true,
      createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
  });
  const available = plan.works.some(
    (entry) =>
      entry.match === "FULL" &&
      entry.work.status?.visible &&
      entry.work.status.publishedAt?.trim(),
  );
  return (
    <PlanningWorkspace active="todo" currentId={id}>
      <section className="space-y-5">
        <Link className={linkClass} href="/admin/todo">
          ← Music plans
        </Link>
        <AdminActionToast
          message={message}
          status={status === "success" ? "success" : "error"}
        />
        <div className={panel}>
          <h1 className="break-words text-3xl font-semibold">{plan.title}</h1>
          <p className="text-sm text-zinc-400">
            {plan.status} · {plan.visible ? "Public" : "Private"} ·{" "}
            {plan.requests.length} source requests
          </p>
          {plan.completedAt ? (
            <p className="text-sm text-zinc-400">
              Completed: {plan.completedAt.toISOString()} ·{" "}
              {available
                ? "Published Work available"
                : "Work currently unavailable or withdrawn"}
            </p>
          ) : null}
          {!plan.requests.length ? (
            <p className="text-xs text-zinc-500">
              Manual or historical plan. Original audience provenance was not
              recorded.
            </p>
          ) : null}
        </div>
        {plan.visible && plan.status !== "CANCELLED" ? (
          <Link
            className={linkClass}
            href={`/song-plans/${encodeURIComponent(plan.id)}`}
          >
            Open public plan
          </Link>
        ) : null}
        <div className={workspace.columns}>
          <div className={workspace.source}>
            <AdminPlanPreview
              key={plan.updatedAt.toISOString()}
              copy={getDefaultSharedCopy().songPlans}
              visible={plan.visible}
              savedStatus={plan.status}
              direction={plan.notes || ""}
              hasPublishedFullWork={available}
              initial={{
                id: plan.id,
                title: plan.title,
                artist: plan.sourceArtists,
                origin: plan.from === "Contact page" ? null : plan.from,
                reference: plan.sourceUrl,
                summary: plan.publicSummary,
                status: plan.status === "CANCELLED" ? "PROPOSED" : plan.status,
                completedAt: plan.completedAt?.toISOString() || null,
                supports: plan._count.votes,
                recent,
                supported: false,
                requestCount: plan.requests.filter(
                  (l) => l.request.status === "ACCEPTED",
                ).length,
                works: plan.works
                  .filter(
                    (l) =>
                      l.work.status?.visible &&
                      l.work.status.publishedAt?.trim() &&
                      l.work.platforms.some(
                        (p) => p.platform === "youtube" && p.platformId,
                      ),
                  )
                  .map((l) => ({
                    title: l.work.content?.songTitle || plan.title,
                    path: l.work.path || l.work.contentId,
                    match: l.match,
                  })),
              }}
            />
            <div className={panel}>
              <h2 className="font-semibold">Source requests</h2>
              {plan.planningDrafts.map(({ draft, proposalKey }) => (
                <p key={`${draft.id}-${proposalKey}`}>
                  <Link
                    className={linkClass}
                    href={`/admin/planning-drafts/${encodeURIComponent(draft.id)}#quote-${encodeURIComponent(proposalKey)}-0`}
                  >
                    AI source / conversation: {draft.sourceName}
                  </Link>
                </p>
              ))}
              {plan.requests.length ? (
                plan.requests.map(({ request }) => (
                  <article
                    key={request.id}
                    className="space-y-2 border-t border-zinc-800 pt-3"
                  >
                    <Link
                      className={linkClass}
                      href={`/admin/requests/${encodeURIComponent(request.id)}`}
                    >
                      {request.title} · {request.status}
                    </Link>
                    <p className="whitespace-pre-wrap break-words text-sm text-zinc-400">
                      {request.ideas || "No adaptation ideas supplied."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  No source requests linked.
                </p>
              )}
            </div>
          </div>
          <div className={workspace.editor}>
            <AdminDirtyForm
              action={savePlanAction}
              id="production-plan"
              className={panel}
              key={plan.updatedAt.toISOString()}
            >
              <h2 className="font-semibold">Production plan</h2>
              <ReviewDetails title="Field state guide">
                <FieldStateGuide />
              </ReviewDetails>
              <input type="hidden" name="planId" value={id} />
              <input
                type="hidden"
                name="updatedAt"
                value={plan.updatedAt.toISOString()}
              />
              <SelectField
                label="Production status"
                name="planStatus"
                value={plan.status}
                options={PLAN_STATUSES.map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <SelectField
                label="Public visibility"
                name="visible"
                value={String(plan.visible)}
                options={[
                  { value: "false", label: "Private" },
                  { value: "true", label: "Public on the song plans page" },
                ]}
              />
              <p className="text-xs text-zinc-500">
                Only the public introduction and approved plan fields are shown.
                Internal notes, original requests and review notes stay private.
                Cancelled plans are hidden.
              </p>
              <ReviewDetails title="Edit song details and private production notes">
                <Field
                  label="Song title"
                  name="title"
                  value={plan.title}
                  required
                  maxLength={300}
                />
                <Field
                  label="Original work / album / game"
                  name="from"
                  value={plan.from}
                  maxLength={500}
                />
                <Field
                  label="Source artists"
                  name="sourceArtists"
                  value={plan.sourceArtists}
                  maxLength={1000}
                />
                <Field
                  label="Reference URL"
                  name="sourceUrl"
                  value={plan.sourceUrl}
                  maxLength={2000}
                  type="url"
                />
                <TextArea
                  label="Production direction / notes (private)"
                  name="notes"
                  value={plan.notes}
                  rows={6}
                />
              </ReviewDetails>
              <TextArea
                label="Public introduction (shown on the website)"
                name="publicSummary"
                value={plan.publicSummary}
                rows={4}
              />
              <PlanSaveButton
                hasPublishedFullWork={available}
                wasCompleted={plan.status === "COMPLETED"}
              />
            </AdminDirtyForm>
            <div className={panel}>
              <h2 className="font-semibold">Linked Works</h2>
              <p className="text-sm text-zinc-400">
                Several plans may share a Work, and one plan may have several
                versions. A draft, partial match or related version does not
                complete a plan.
              </p>
              {plan.works.map((entry) => (
                <article
                  className="space-y-4 border-t border-zinc-800 pt-4"
                  key={entry.contentId}
                >
                  <Link
                    className={linkClass}
                    href={`/admin/content/${encodeURIComponent(entry.contentId)}`}
                  >
                    {entry.work.content?.songTitle || entry.contentId} ·{" "}
                    {entry.contentId}
                  </Link>
                  <p className="text-xs text-zinc-400">
                    {entry.work.status?.visible &&
                    entry.work.status.publishedAt?.trim()
                      ? "Published and visible"
                      : "Draft / hidden / withdrawn"}
                  </p>
                  <AdminDirtyForm
                    action={linkWorkAction}
                    className="space-y-3"
                    key={entry.updatedAt.toISOString()}
                  >
                    <input type="hidden" name="planId" value={id} />
                    <input
                      type="hidden"
                      name="contentId"
                      value={entry.contentId}
                    />
                    <SelectField
                      label="Fulfilment"
                      name="match"
                      value={entry.match}
                      options={matchOptions}
                    />
                    <TextArea
                      label="Version / fulfilment notes"
                      name="linkNotes"
                      value={entry.notes}
                      rows={2}
                    />
                    <PlanningSubmit>Update Work link</PlanningSubmit>
                  </AdminDirtyForm>
                  <form action={unlinkWorkAction}>
                    <input type="hidden" name="planId" value={id} />
                    <input
                      type="hidden"
                      name="contentId"
                      value={entry.contentId}
                    />
                    <button
                      className="text-xs text-zinc-400 underline"
                      type="submit"
                    >
                      Detach Work (keeps the Work)
                    </button>
                  </form>
                </article>
              ))}
              {!plan.works.length ? (
                <p className="text-sm text-zinc-500">No Works linked yet.</p>
              ) : null}
            </div>
            <div className={panel}>
              <h2 className="font-semibold">Link an existing Work</h2>
              <form className="flex flex-wrap gap-3" method="get">
                <input
                  className="min-w-0 rounded border border-zinc-700 bg-zinc-950 p-2"
                  name="q"
                  defaultValue={q}
                  placeholder="Search Work title or CID"
                  aria-label="Search Works"
                />
                <button
                  className="rounded border border-zinc-700 px-3"
                  type="submit"
                >
                  Find Works
                </button>
              </form>
              {works.length ? (
                <AdminDirtyForm action={linkWorkAction} className="space-y-3">
                  <input type="hidden" name="planId" value={id} />
                  <SelectField
                    label="Work"
                    name="contentId"
                    placeholder="Select a Work"
                    required
                    value=""
                    options={works.map((work) => ({
                      value: work.contentId,
                      label: `${work.content?.songTitle || "Untitled"} · ${work.contentId} · ${work.status?.visible && work.status.publishedAt ? "Published" : "Draft / hidden"}`,
                    }))}
                  />
                  <SelectField
                    label="Fulfilment"
                    name="match"
                    value="RELATED"
                    options={matchOptions}
                  />
                  <TextArea
                    label="Version / fulfilment notes"
                    name="linkNotes"
                    rows={2}
                  />
                  <PlanningSubmit>Link Work</PlanningSubmit>
                </AdminDirtyForm>
              ) : (
                <p className="text-sm text-zinc-500">
                  No unlinked Works match this search.
                </p>
              )}
              <Link
                className={linkClass}
                href={`/admin/todo?action=todo.start&todo=${encodeURIComponent(id)}`}
              >
                Create a new draft Work from this plan
              </Link>
            </div>
          </div>
        </div>
        <ReviewHistory type="PLAN" id={id} compact />
      </section>
    </PlanningWorkspace>
  );
}
