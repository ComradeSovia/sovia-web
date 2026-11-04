import { createHash } from "node:crypto";
import {
  normalizeSongKey,
  type PlanningProposal,
  planningPreviewSchema,
  proposalNotes,
  requestSourceText,
  reviewedProposalsSchema,
  validateProposalSources,
} from "../model/planning-proposals";
import { auditPlanChange, requestSnapshot, writeAudit } from "./review-audit";
import { planningPrisma } from "./song-requests";

export async function saveNewPlanningDraft(value: unknown) {
  const input = planningPreviewSchema.parse(value);
  input.sourceText = input.sourceText.replace(/\r\n/g, "\n").trim();
  validateProposalSources(input.sourceText, input.proposals);
  const prisma = planningPrisma();
  if (input.requestId) {
    const request = await prisma.songRequest.findUniqueOrThrow({
      where: { id: input.requestId },
    });
    if (
      requestSourceText(request).replace(/\r\n/g, "\n").trim() !==
        input.sourceText ||
      input.proposals.length > 1 ||
      !input.requestVersion
    )
      throw new Error(
        "The source does not match this request. Analyze the request again.",
      );
  }
  const sourceHash = createHash("sha256")
    .update(`${input.requestId || "chat"}\0${input.sourceText}`)
    .digest("hex");
  const draft = await prisma.musicPlanningDraft.upsert({
    where: { sourceHash },
    update: {},
    create: {
      sourceHash,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl || null,
      sourceText: input.sourceText,
      originalRequestId: input.requestId,
      requestVersion: input.requestVersion
        ? new Date(input.requestVersion)
        : null,
      proposals: input.proposals,
      model: input.model,
      promptKey: input.promptKey,
    },
  });
  return { draftId: draft.id };
}

export async function updatePlanningDraft(
  id: string,
  version: number,
  value: unknown,
  actor = "system",
) {
  const proposals = reviewedProposalsSchema.parse(value);
  return planningPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM music_planning_drafts WHERE id = ${id} FOR UPDATE`;
    const draft = await tx.musicPlanningDraft.findUniqueOrThrow({
      where: { id },
    });
    if (draft.status !== "DRAFT")
      throw new Error("This draft has already been adopted and is read-only.");
    if (draft.version !== version)
      throw new Error(
        "This draft changed in another tab. Reload before saving.",
      );
    const original = reviewedProposalsSchema.parse(draft.proposals);
    if (
      proposals.length !== original.length ||
      proposals.some(
        (p) =>
          !original.some(
            (o) =>
              o.key === p.key &&
              JSON.stringify(o.evidenceQuotes) ===
                JSON.stringify(p.evidenceQuotes),
          ),
      )
    )
      throw new Error(
        "Proposal identities and original evidence cannot be overwritten.",
      );
    validateProposalSources(draft.sourceText, proposals, false);
    const updated = await tx.musicPlanningDraft.update({
      where: { id },
      data: { proposals, version: { increment: 1 } },
    });
    await writeAudit(tx, {
      actor,
      action: "DRAFT_EDITED",
      entityType: "DRAFT",
      entityId: id,
      title: draft.sourceName,
      before: { proposals: draft.proposals, version: draft.version },
      after: { proposals: updated.proposals, version: updated.version },
    });
    return updated;
  });
}

function sameSong(
  a: { title: string; sourceArtists: string | null },
  b: PlanningProposal,
) {
  return (
    normalizeSongKey(a.title) === normalizeSongKey(b.title) &&
    normalizeSongKey(a.sourceArtists || "") ===
      normalizeSongKey(b.sourceArtists)
  );
}

export async function refreshPlanningDraftRequest(
  id: string,
  version: number,
  actor = "system",
) {
  return planningPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM music_planning_drafts WHERE id = ${id} FOR UPDATE`;
    const draft = await tx.musicPlanningDraft.findUniqueOrThrow({
      where: { id },
    });
    if (
      draft.status !== "DRAFT" ||
      draft.version !== version ||
      !draft.originalRequestId
    )
      throw new Error(
        "Reload this request draft before refreshing its source status.",
      );
    await tx.$queryRaw`SELECT id FROM song_requests WHERE id = ${draft.originalRequestId} FOR UPDATE`;
    const request = await tx.songRequest.findUniqueOrThrow({
      where: { id: draft.originalRequestId },
    });
    if (
      requestSourceText(request).replace(/\r\n/g, "\n").trim() !==
      draft.sourceText
    )
      throw new Error(
        "The original text changed. Generate a new preview from the current request.",
      );
    const updated = await tx.musicPlanningDraft.update({
      where: { id },
      data: { requestVersion: request.updatedAt, version: { increment: 1 } },
    });
    await writeAudit(tx, {
      actor,
      action: "DRAFT_SOURCE_REFRESHED",
      entityType: "DRAFT",
      entityId: id,
      relatedType: "REQUEST",
      relatedId: request.id,
      title: draft.sourceName,
      before: { requestVersion: draft.requestVersion, version: draft.version },
      after: {
        requestVersion: updated.requestVersion,
        version: updated.version,
      },
    });
    return updated;
  });
}

export async function adoptPlanningDraft(
  id: string,
  version: number,
  actor = "system",
) {
  return planningPrisma().$transaction(
    async (tx) => {
      // Serialize AI adoptions so simultaneous imports cannot bypass the latest duplicate check.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(2938137)`;
      await tx.$queryRaw`SELECT id FROM music_planning_drafts WHERE id = ${id} FOR UPDATE`;
      const draft = await tx.musicPlanningDraft.findUniqueOrThrow({
        where: { id },
        include: { plans: true },
      });
      if (draft.status === "APPLIED")
        return [...new Set(draft.plans.map((link) => link.planId))];
      if (draft.version !== version)
        throw new Error(
          "This draft changed. Save and review its current version first.",
        );
      const proposals = reviewedProposalsSchema.parse(draft.proposals);
      validateProposalSources(draft.sourceText, proposals, false);
      const selected = proposals.filter(
        (proposal) => proposal.decision !== "skip",
      );
      if (!selected.length)
        throw new Error(
          "Choose at least one proposal to adopt. Empty results can remain a draft.",
        );
      if (draft.originalRequestId) {
        await tx.$queryRaw`SELECT id FROM song_requests WHERE id = ${draft.originalRequestId} FOR UPDATE`;
        const request = await tx.songRequest.findUniqueOrThrow({
          where: { id: draft.originalRequestId },
        });
        if (
          !draft.requestVersion ||
          request.updatedAt.getTime() !== draft.requestVersion.getTime()
        )
          throw new Error(
            "The original request was reviewed or changed since generation. Re-analyze it, or use the request review page to avoid creating a duplicate plan.",
          );
      }
      const existing = await tx.adminMusicTodo.findMany({
        where: { status: { not: "CANCELLED" } },
        select: { id: true, title: true, sourceArtists: true },
      });
      const byProposal = new Map<string, string>();
      const created: PlanningProposal[] = [];
      for (const proposal of selected.filter((p) => p.decision !== "same")) {
        if (proposal.decision === "merge") {
          if (!existing.some((plan) => plan.id === proposal.target))
            throw new Error(
              `Select an existing, non-cancelled plan for ${proposal.title}.`,
            );
          byProposal.set(proposal.key, proposal.target);
        } else {
          if (
            !proposal.allowDuplicate &&
            (existing.some((plan) => sameSong(plan, proposal)) ||
              created.some((p) => sameSong(p, proposal)))
          )
            throw new Error(
              `A matching song already has a plan: ${proposal.title}. Merge it, combine this batch, or explicitly confirm a separate adaptation.`,
            );
          const plan = await tx.adminMusicTodo.create({
            data: {
              title: proposal.title,
              from: proposal.from || null,
              sourceArtists: proposal.sourceArtists || null,
              sourceUrl: proposal.sourceUrl || null,
              notes: proposalNotes(proposal),
              publicSummary: proposal.publicSummary || null,
              visible: false,
              status: "PLANNING",
            },
          });
          await auditPlanChange(tx, plan.id, null, actor, "PLAN_CREATED");
          byProposal.set(proposal.key, plan.id);
          created.push(proposal);
        }
      }
      for (const proposal of selected.filter((p) => p.decision === "same")) {
        const target = selected.find(
          (candidate) =>
            candidate.key === proposal.target &&
            ["create", "merge"].includes(candidate.decision),
        );
        const planId = target && byProposal.get(target.key);
        if (!planId)
          throw new Error(
            `Select a different Create/Merge proposal as the batch target for ${proposal.title}. Chains and cycles are not allowed.`,
          );
        byProposal.set(proposal.key, planId);
      }
      const associations = new Map<
        string,
        {
          requestId: string;
          planId: string;
          title: string;
          before: ReturnType<typeof requestSnapshot> | null;
          linkCreated: boolean;
          edgeAt: string;
          draftLinks: { draftId: string; proposalKey: string }[];
          undoable: boolean;
        }
      >();
      for (const proposal of selected) {
        const planId = byProposal.get(proposal.key);
        if (!planId) throw new Error("A selected proposal has no target plan.");
        const priorRequest = draft.originalRequestId
          ? await tx.songRequest.findUniqueOrThrow({
              where: { id: draft.originalRequestId },
            })
          : null;
        let requestId = draft.originalRequestId;
        if (!requestId) {
          const request = await tx.songRequest.create({
            data: {
              title: proposal.title.slice(0, 200),
              artist: proposal.sourceArtists || null,
              origin: proposal.from || null,
              sourceUrl: proposal.sourceUrl || null,
              ideas: proposal.requestedChanges || null,
              channel: "CHAT_IMPORT",
              sourceDraftId: id,
              sourceProposalKey: proposal.key,
              status: "ACCEPTED",
              reviewedAt: new Date(),
            },
          });
          requestId = request.id;
        } else
          await tx.songRequest.update({
            where: { id: requestId },
            data: { status: "ACCEPTED", reviewedAt: new Date() },
          });
        const oldEdge = await tx.songRequestPlan.findUnique({
          where: { requestId_planId: { requestId, planId } },
        });
        const edge = await tx.songRequestPlan.upsert({
          where: { requestId_planId: { requestId, planId } },
          create: { requestId, planId },
          update: {},
        });
        await tx.musicPlanningDraftPlan.create({
          data: { draftId: id, proposalKey: proposal.key, planId },
        });
        const key = `${requestId}\0${planId}`;
        const association = associations.get(key) || {
          requestId,
          planId,
          title: priorRequest?.title || proposal.title,
          before: priorRequest ? requestSnapshot(priorRequest) : null,
          linkCreated: !oldEdge,
          edgeAt: edge.createdAt.toISOString(),
          draftLinks: [],
          undoable: false,
        };
        association.draftLinks.push({ draftId: id, proposalKey: proposal.key });
        association.undoable ||= ["merge", "same"].includes(proposal.decision);
        associations.set(key, association);
        const planBefore = await tx.adminMusicTodo.findUniqueOrThrow({
          where: { id: planId },
        });
        await tx.adminMusicTodo.updateMany({
          where: { id: planId, status: "PROPOSED" },
          data: { status: "PLANNING" },
        });
        await auditPlanChange(tx, planId, planBefore, actor);
      }
      for (const association of associations.values()) {
        const after = await tx.songRequest.findUniqueOrThrow({
          where: { id: association.requestId },
        });
        await writeAudit(tx, {
          actor,
          action: association.undoable ? "REQUEST_MERGED" : "REQUEST_REVIEWED",
          entityType: "REQUEST",
          entityId: association.requestId,
          relatedType: "PLAN",
          relatedId: association.planId,
          sourceType: "DRAFT",
          sourceId: id,
          title: association.title,
          before: {
            request: association.before,
            linked: !association.linkCreated,
          },
          after: {
            request: requestSnapshot(after),
            linked: true,
            draftLinks: association.draftLinks,
          },
          undo: association.undoable
            ? {
                kind: "request-plan",
                requestId: association.requestId,
                planId: association.planId,
                edgeAt: association.edgeAt,
                linkCreated: association.linkCreated,
                draftLinks: association.draftLinks,
              }
            : {},
        });
      }
      await writeAudit(tx, {
        actor,
        action: "DRAFT_ADOPTED",
        entityType: "DRAFT",
        entityId: id,
        title: draft.sourceName,
        before: { status: draft.status, version: draft.version },
        after: {
          status: "APPLIED",
          version: draft.version + 1,
          plans: [...new Set(byProposal.values())],
          requests: [...associations.values()].map((a) => a.requestId),
        },
      });
      await tx.musicPlanningDraft.update({
        where: { id },
        data: { status: "APPLIED", version: { increment: 1 } },
      });
      return [...new Set(byProposal.values())];
    },
    { timeout: 20000 },
  );
}
