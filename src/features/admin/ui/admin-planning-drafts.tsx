import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "../data/auth";
import { findRequestMatches, planningPrisma } from "../data/song-requests";
import {
  normalizeSongKey,
  reviewedProposalsSchema,
  sourceEvidence,
} from "../model/planning-proposals";
import { planComparison, workComparison } from "../model/review-comparison";
import {
  adoptPlanningDraftAction,
  refreshPlanningDraftSourceAction,
  savePlanningDraftAction,
} from "../planning-draft-actions";
import { AdminActionToast } from "./admin-action-toast";
import {
  AdminGate,
  Field,
  FieldStateGuide,
  SelectField,
  TextArea,
} from "./admin-content";
import { AdminDirtyForm } from "./admin-step-panels";
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
export function AdminPlanningDraftsPage({
  page,
  requestId,
}: {
  page: number;
  requestId?: string;
}) {
  return (
    <AdminGate returnTo="/admin/planning-drafts">
      <DraftList page={page} requestId={requestId} />
    </AdminGate>
  );
}
async function DraftList({
  page,
  requestId,
}: {
  page: number;
  requestId?: string;
}) {
  await requireAdminSession();
  const drafts = await planningPrisma().musicPlanningDraft.findMany({
    where: requestId ? { originalRequestId: requestId } : {},
    select: {
      id: true,
      sourceName: true,
      status: true,
      updatedAt: true,
      version: true,
      _count: { select: { plans: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * 30,
    take: 31,
  });
  const url = (next: number) =>
    `/admin/planning-drafts?${new URLSearchParams({ page: String(next), ...(requestId ? { request: requestId } : {}) })}`;
  return (
    <section className="space-y-5">
      <PlanningNavigation active="planning-drafts" />
      <div className={panel}>
        <h1 className="text-3xl font-semibold">Planning drafts</h1>
        <p className="text-sm text-zinc-400">
          Private conversation sources and editable AI proposals. Saving a draft
          does not approve requests or publish plans.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link
            className={link}
            href="/admin/planning-drafts?action=todo.analyze-proposals"
          >
            Analyze pasted conversation
          </Link>
          <Link className={link} href="/admin/todo">
            Music plans
          </Link>
          {requestId ? (
            <Link className={link} href="/admin/planning-drafts">
              All drafts
            </Link>
          ) : null}
        </div>
      </div>
      {drafts.slice(0, 30).map((draft) => (
        <article className={workspace.queueRow} key={draft.id}>
          <Link
            className={link}
            href={`/admin/planning-drafts/${encodeURIComponent(draft.id)}`}
          >
            {draft.sourceName}
          </Link>
          <ReviewBadge value={draft.status} />
          <p className="text-xs text-zinc-400">
            {draft.status} · version {draft.version} ·{" "}
            {draft.updatedAt.toISOString()} · {draft._count.plans} adopted
            proposals
          </p>
        </article>
      ))}
      {!drafts.length ? (
        <p className="text-zinc-400">
          No saved drafts yet. Generate a preview and choose Save private draft.
        </p>
      ) : null}
      <nav className="flex gap-5">
        {page > 1 ? (
          <Link className={link} href={url(page - 1)}>
            Previous
          </Link>
        ) : null}
        {drafts.length > 30 ? (
          <Link className={link} href={url(page + 1)}>
            Next
          </Link>
        ) : null}
      </nav>
    </section>
  );
}

export function AdminPlanningDraftPage(props: {
  id: string;
  message?: string;
  status?: string;
}) {
  return (
    <AdminGate
      returnTo={`/admin/planning-drafts/${encodeURIComponent(props.id)}`}
    >
      <DraftDetail {...props} />
    </AdminGate>
  );
}
async function DraftDetail({
  id,
  message,
  status,
}: {
  id: string;
  message?: string;
  status?: string;
}) {
  await requireAdminSession();
  const prisma = planningPrisma();
  const draft = await prisma.musicPlanningDraft.findUnique({
    where: { id },
    include: {
      plans: {
        include: { plan: { select: { id: true, title: true, status: true } } },
      },
      originalRequest: {
        select: { id: true, title: true, status: true, updatedAt: true },
      },
      importedRequests: { select: { id: true, title: true } },
    },
  });
  if (!draft) notFound();
  const proposals = reviewedProposalsSchema.parse(draft.proposals);
  const [matches, allPlans] = await Promise.all([
    Promise.all(
      proposals.map((proposal) =>
        findRequestMatches({
          title: proposal.title,
          sourceUrl: proposal.sourceUrl || null,
        }),
      ),
    ),
    prisma.adminMusicTodo.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { id: true, title: true, sourceArtists: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const stale =
    draft.originalRequest &&
    draft.requestVersion?.getTime() !==
      draft.originalRequest.updatedAt.getTime();
  return (
    <PlanningWorkspace active="planning-drafts" currentId={id}>
      <section className="space-y-5">
        <Link className={link} href="/admin/planning-drafts">
          ← Planning drafts
        </Link>
        <AdminActionToast
          message={message}
          status={status === "success" ? "success" : "error"}
        />
        <div className={panel}>
          <h1 className="break-words text-3xl font-semibold">
            {draft.sourceName}
          </h1>
          <p className="text-sm text-zinc-400">
            {draft.status} · version {draft.version} · {proposals.length}{" "}
            proposals · {draft.model || "Unknown model"} ·{" "}
            {draft.promptKey || "Unknown prompt"}
          </p>
          <p className="text-xs text-zinc-500">
            Original source and evidence are private and immutable. Editing a
            proposal updates only this draft. New plans are private; merging
            keeps existing plan fields unchanged.
          </p>
          {draft.sourceUrl ? (
            <a
              className={link}
              href={draft.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Original conversation link
            </a>
          ) : null}
          {draft.originalRequest ? (
            <p>
              <Link
                className={link}
                href={`/admin/requests/${encodeURIComponent(draft.originalRequest.id)}`}
              >
                Original request: {draft.originalRequest.title} ·{" "}
                {draft.originalRequest.status}
              </Link>
            </p>
          ) : null}
          {stale && draft.status === "DRAFT" ? (
            <p className="text-sm text-amber-300">
              The original request has changed since analysis. Review its
              current plans before adopting. This saved snapshot remains
              available.
            </p>
          ) : null}
        </div>
        {stale && draft.status === "DRAFT" ? (
          <div className={panel}>
            <h2 className="font-semibold">Refresh source review status</h2>
            <PlanningAdoptForm
              action={refreshPlanningDraftSourceAction}
              confirmation="I opened the original request and reviewed its current status and plan links. Refresh the expected source version, keeping my draft edits unchanged."
              buttonLabel="Refresh source version — no plans created"
            >
              <input type="hidden" name="draftId" value={id} />
              <input type="hidden" name="version" value={draft.version} />
            </PlanningAdoptForm>
          </div>
        ) : null}
        <div className={workspace.columns}>
          <div className={workspace.source}>
            <details className={panel} open>
              <summary className="cursor-pointer font-semibold">
                Original source · highlighted evidence
              </summary>
              <PlanningSource source={draft.sourceText} proposals={proposals} />
            </details>
          </div>
          <div className={workspace.editor}>
            {draft.status === "APPLIED" ? (
              <div className={panel}>
                <h2 className="font-semibold">Adopted plans</h2>
                {[
                  ...new Map(
                    draft.plans.map(({ plan }) => [plan.id, plan]),
                  ).values(),
                ].map((plan) => (
                  <p key={plan.id}>
                    <Link
                      className={link}
                      href={`/admin/todo/${encodeURIComponent(plan.id)}`}
                    >
                      {plan.title} · {plan.status}
                    </Link>
                  </p>
                ))}
                {draft.importedRequests.map((request) => (
                  <p key={request.id}>
                    <Link
                      className={link}
                      href={`/admin/requests/${encodeURIComponent(request.id)}`}
                    >
                      Imported request: {request.title}
                    </Link>
                  </p>
                ))}
                <p className="text-sm text-zinc-400">
                  This adopted source record is read-only. Edit production
                  fields on the linked plan.
                </p>
                {proposals.map((proposal) => (
                  <details
                    className="space-y-3 border-t border-zinc-800 pt-3"
                    key={proposal.key}
                  >
                    <summary className="cursor-pointer font-semibold">
                      Reviewed proposal: {proposal.title} · {proposal.decision}
                    </summary>
                    <p className="whitespace-pre-wrap text-sm">
                      <strong>Audience request:</strong>{" "}
                      {proposal.requestedChanges || "None specified"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      <strong>Production direction:</strong>{" "}
                      {proposal.notes || "None specified"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      <strong>Needs confirmation:</strong>{" "}
                      {proposal.missingInfo || "None recorded"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      <strong>Public introduction:</strong>{" "}
                      {proposal.publicSummary || "None recorded"}
                    </p>
                  </details>
                ))}
              </div>
            ) : (
              <>
                <AdminDirtyForm
                  action={savePlanningDraftAction}
                  id="planning-draft-review"
                  className="space-y-5"
                  key={draft.version}
                >
                  <input type="hidden" name="draftId" value={id} />
                  <input type="hidden" name="version" value={draft.version} />
                  <div className={panel}>
                    <h2 className="font-semibold">Review proposals</h2>
                    <ReviewDetails title="Field state guide">
                      <FieldStateGuide />
                    </ReviewDetails>
                    <p className="text-xs text-zinc-400">
                      Save edits first. Then use the separate adoption control
                      below. Same-song matches require a merge choice or
                      explicit confirmation of a distinct adaptation.
                    </p>
                  </div>
                  {proposals.map((proposal, index) => {
                    const [planMatches, workMatches] = matches[index];
                    const siblings = proposals.filter(
                      (p) => p.key !== proposal.key,
                    );
                    const sameBatch = siblings.filter(
                      (p) =>
                        normalizeSongKey(p.title) ===
                        normalizeSongKey(proposal.title),
                    );
                    return (
                      <article
                        className={panel}
                        key={proposal.key}
                        id={`proposal-${proposal.key}`}
                      >
                        <div className="flex items-center justify-between gap-3 font-semibold">
                          <span>
                            {index + 1}. {proposal.title}
                          </span>
                          <ReviewBadge value={proposal.decision} />
                        </div>
                        <ProposalPreview
                          title={proposal.title}
                          artist={proposal.sourceArtists}
                          notes={proposal.notes}
                          missing={proposal.missingInfo}
                        />
                        <ReviewDetails title="Source excerpts">
                          <div className="space-y-3 rounded border border-zinc-700 bg-zinc-950 p-3 text-xs">
                            <p className="font-semibold text-zinc-300">
                              Source evidence
                            </p>
                            {sourceEvidence(
                              draft.sourceText,
                              proposal.evidenceQuotes,
                            ).map((evidence, quoteIndex) => (
                              <div key={`${evidence.start}-${evidence.end}`}>
                                <blockquote className="whitespace-pre-wrap break-words border-l-2 border-zinc-600 pl-3">
                                  {evidence.quote}
                                </blockquote>
                                <a
                                  className={link}
                                  href={`#quote-${proposal.key}-${quoteIndex}`}
                                >
                                  Locate original [{evidence.start}–
                                  {evidence.end}]
                                </a>
                              </div>
                            ))}
                          </div>
                        </ReviewDetails>
                        <DuplicateComparison
                          incoming={{
                            title: proposal.title,
                            artist: proposal.sourceArtists,
                            origin: proposal.from,
                            direction: proposal.notes,
                          }}
                          candidates={[
                            ...planMatches.map(planComparison),
                            ...workMatches.map(workComparison),
                            ...sameBatch.map((p) => ({
                              id: p.key,
                              kind: "batch" as const,
                              title: p.title,
                              artist: p.sourceArtists,
                              origin: p.from,
                              direction: p.notes,
                              status: p.decision,
                              href: `#proposal-${p.key}`,
                              selectable: ["create", "merge"].includes(
                                p.decision,
                              ),
                            })),
                          ]}
                          formId="planning-draft-review"
                          mode="draft"
                          proposalKey={proposal.key}
                        />
                        <SelectField
                          label="Adoption choice"
                          name={`decision-${proposal.key}`}
                          value={proposal.decision}
                          options={[
                            {
                              value: "create",
                              label: "Create a new private plan",
                            },
                            {
                              value: "merge",
                              label: "Attach request to an existing plan",
                            },
                            {
                              value: "same",
                              label:
                                "Combine with another proposal in this batch",
                            },
                            { value: "skip", label: "Ignore this proposal" },
                          ]}
                        />
                        <SelectField
                          label="Merge / combine target (used only for those choices)"
                          name={`target-${proposal.key}`}
                          value={proposal.target}
                          options={[
                            { value: "", label: "No target selected" },
                            ...allPlans.map((plan) => ({
                              value: plan.id,
                              label: `Existing: ${plan.title} · ${plan.sourceArtists || "Unknown artist"} · ${plan.id}`,
                            })),
                            ...siblings.map((p) => ({
                              value: p.key,
                              label: `This batch: ${p.title} · ${p.sourceArtists || "Unknown artist"}`,
                            })),
                          ]}
                        />
                        <ReviewDetails title="Edit song details and duplicate override">
                          <SelectField
                            label="Separate adaptation override (new plans only)"
                            name={`allowDuplicate-${proposal.key}`}
                            value={String(proposal.allowDuplicate)}
                            options={[
                              {
                                value: "false",
                                label:
                                  "Stop adoption when the same song already has a plan",
                              },
                              {
                                value: "true",
                                label:
                                  "I reviewed the matches: create a distinct adaptation anyway",
                              },
                            ]}
                          />
                          <Field
                            label="Song title"
                            name={`title-${proposal.key}`}
                            value={proposal.title}
                            required
                            maxLength={300}
                          />
                          <Field
                            label="Original work / album / game"
                            name={`from-${proposal.key}`}
                            value={proposal.from}
                            maxLength={500}
                          />
                          <Field
                            label="Source artists"
                            name={`sourceArtists-${proposal.key}`}
                            value={proposal.sourceArtists}
                            maxLength={1000}
                          />
                          <Field
                            label="Song reference URL"
                            name={`sourceUrl-${proposal.key}`}
                            value={proposal.sourceUrl}
                            maxLength={2000}
                            type="url"
                          />
                          <TextArea
                            label="Audience requirements (from original source)"
                            name={`requestedChanges-${proposal.key}`}
                            value={proposal.requestedChanges}
                            maxLength={800}
                            rows={3}
                          />
                          <TextArea
                            label="AI production suggestion / your revised plan"
                            name={`notes-${proposal.key}`}
                            value={proposal.notes}
                            maxLength={2000}
                            rows={5}
                          />
                          <TextArea
                            label="Missing information / needs confirmation"
                            name={`missingInfo-${proposal.key}`}
                            value={proposal.missingInfo}
                            maxLength={800}
                            rows={3}
                          />
                          <TextArea
                            label="Public introduction (plans still default to private)"
                            name={`publicSummary-${proposal.key}`}
                            value={proposal.publicSummary}
                            maxLength={2000}
                            rows={3}
                          />
                        </ReviewDetails>
                      </article>
                    );
                  })}
                  <div className={workspace.saveBar}>
                    <PlanningSubmit>
                      Save draft edits — no plans created
                    </PlanningSubmit>
                    <PlanningSubmit next>
                      Save and view next draft
                    </PlanningSubmit>
                  </div>
                </AdminDirtyForm>
                <div className={panel}>
                  <h2 className="font-semibold">Adopt the saved draft</h2>
                  <p className="text-xs text-zinc-400">
                    The entire batch is atomic. Invalid targets, stale versions
                    or unconfirmed duplicates leave all requests and plans
                    unchanged. Retrying a successful adoption returns its
                    original links.
                  </p>
                  <PlanningAdoptForm
                    action={adoptPlanningDraftAction}
                    nextLabel="Adopt and view next draft"
                  >
                    <input type="hidden" name="draftId" value={id} />
                    <input type="hidden" name="version" value={draft.version} />
                  </PlanningAdoptForm>
                </div>
              </>
            )}
          </div>
        </div>
        <ReviewHistory type="DRAFT" id={id} compact />
      </section>
    </PlanningWorkspace>
  );
}
