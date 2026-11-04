import { getPrismaClient } from "@sovia/sound/data/prisma";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { commentProposalsSchema } from "../model/comment-review";

export const AUDIT_TYPES = [
  "REQUEST",
  "PLAN",
  "DRAFT",
  "COMMENT",
  "WORK",
] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];
export function auditDb() {
  const db = getPrismaClient();
  if (!db) throw new Error("Database unavailable.");
  return db;
}
function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}
export function planSnapshot(p: {
  title: string;
  status: string;
  visible: boolean;
  from?: string | null;
  sourceArtists?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  publicSummary?: string | null;
  contentId?: string | null;
  completedAt?: Date | null;
}) {
  return {
    title: p.title,
    status: p.status,
    visible: p.visible,
    from: p.from ?? null,
    sourceArtists: p.sourceArtists ?? null,
    sourceUrl: p.sourceUrl ?? null,
    notes: p.notes ?? null,
    publicSummary: p.publicSummary ?? null,
    contentId: p.contentId ?? null,
    completedAt: p.completedAt?.toISOString() ?? null,
  };
}
export function requestSnapshot(r: {
  status: string;
  reviewNotes: string | null;
  reviewedAt: Date | null;
}) {
  return {
    status: r.status,
    reviewNotes: r.reviewNotes,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
  };
}
export async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    actor?: string;
    action: string;
    entityType: AuditType;
    entityId: string;
    title: string;
    relatedType?: AuditType;
    relatedId?: string;
    sourceType?: AuditType;
    sourceId?: string;
    before?: unknown;
    after?: unknown;
    undo?: unknown;
    undoOfId?: string;
    reason?: string;
  },
) {
  return tx.reviewAuditEvent.create({
    data: {
      ...input,
      actor: input.actor || "system",
      before: json(input.before),
      after: json(input.after),
      undo: json(input.undo),
    },
  });
}
export async function auditPlanChange(
  tx: Prisma.TransactionClient,
  planId: string,
  before: Parameters<typeof planSnapshot>[0] | null,
  actor = "system",
  action = "PLAN_UPDATED",
) {
  const after = await tx.adminMusicTodo.findUniqueOrThrow({
    where: { id: planId },
  });
  if (
    JSON.stringify(before && planSnapshot(before)) ===
    JSON.stringify(planSnapshot(after))
  )
    return;
  return writeAudit(tx, {
    actor,
    action:
      before && before.visible !== after.visible
        ? after.visible
          ? "PLAN_PUBLISHED"
          : "PLAN_HIDDEN"
        : action,
    entityType: "PLAN",
    entityId: planId,
    title: after.title,
    before: before ? planSnapshot(before) : {},
    after: planSnapshot(after),
  });
}

const draftLink = z.object({ draftId: z.string(), proposalKey: z.string() });
export const undoMergeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("request-plan"),
    requestId: z.string(),
    planId: z.string(),
    edgeAt: z.string(),
    linkCreated: z.boolean(),
    draftLinks: z.array(draftLink),
  }),
  z.object({
    kind: z.literal("comment-request"),
    reviewId: z.string(),
    proposalKey: z.string(),
    requestId: z.string(),
  }),
]);

export async function undoReviewMerge(
  eventId: string,
  reason: string,
  actor = "system",
) {
  const explanation = z.string().trim().min(1).max(1000).parse(reason);
  return auditDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM review_audit_events WHERE id = ${eventId} FOR UPDATE`;
      const event = await tx.reviewAuditEvent.findUniqueOrThrow({
        where: { id: eventId },
      });
      const priorUndo = await tx.reviewAuditEvent.findUnique({
        where: { undoOfId: eventId },
      });
      if (priorUndo) return priorUndo;
      if (!["REQUEST_MERGED", "COMMENT_MERGED"].includes(event.action))
        throw new Error("Only recorded merge operations can be undone.");
      const payload = undoMergeSchema.parse(event.undo);
      if (payload.kind === "request-plan") {
        await tx.$queryRaw`SELECT id FROM song_requests WHERE id = ${payload.requestId} FOR UPDATE`;
        const request = await tx.songRequest.findUniqueOrThrow({
          where: { id: payload.requestId },
        });
        const edge = await tx.songRequestPlan.findUnique({
          where: {
            requestId_planId: { requestId: request.id, planId: payload.planId },
          },
        });
        if (!edge || edge.createdAt.toISOString() !== payload.edgeAt)
          throw new Error(
            "This association was removed or replaced after the merge. Inspect the current links instead.",
          );
        const detached = await tx.reviewAuditEvent.findFirst({
          where: {
            entityType: "REQUEST",
            entityId: request.id,
            relatedType: "PLAN",
            relatedId: payload.planId,
            action: "REQUEST_DETACHED",
            createdAt: { gte: event.createdAt },
          },
        });
        if (detached)
          throw new Error(
            "This association has been detached and relinked since the merge. Use its current record.",
          );
        for (const link of payload.draftLinks) {
          const source = await tx.musicPlanningDraftPlan.findUnique({
            where: { draftId_proposalKey: link },
          });
          if (!source || source.planId !== payload.planId)
            throw new Error(
              "The draft association changed. Reload and inspect the source record.",
            );
        }
        if (payload.linkCreated) {
          // An imported request can later be organized again as a single-request
          // draft. Both source families may now depend on this same association.
          const sources = await tx.musicPlanningDraftPlan.findMany({
            where: {
              planId: payload.planId,
              OR: [
                { draft: { originalRequestId: request.id } },
                ...(request.sourceDraftId && request.sourceProposalKey
                  ? [
                      {
                        draftId: request.sourceDraftId,
                        proposalKey: request.sourceProposalKey,
                      },
                    ]
                  : []),
              ],
            },
          });
          if (
            sources.some(
              (s) =>
                !payload.draftLinks.some(
                  (l) =>
                    l.draftId === s.draftId && l.proposalKey === s.proposalKey,
                ),
            )
          )
            throw new Error(
              "Another adopted source now uses this association. Review that source before detaching it.",
            );
        }
        for (const link of payload.draftLinks)
          await tx.musicPlanningDraftPlan.delete({
            where: { draftId_proposalKey: link },
          });
        if (payload.linkCreated)
          await tx.songRequestPlan.delete({
            where: {
              requestId_planId: {
                requestId: request.id,
                planId: payload.planId,
              },
            },
          });
        const remaining = await tx.songRequestPlan.count({
          where: { requestId: request.id },
        });
        const updated = await tx.songRequest.update({
          where: { id: request.id },
          data: {
            updatedAt: new Date(),
            ...(!remaining && request.status === "ACCEPTED"
              ? { status: "PENDING", reviewedAt: null }
              : {}),
          },
        });
        return writeAudit(tx, {
          actor,
          action: "MERGE_UNDONE",
          entityType: "REQUEST",
          entityId: request.id,
          relatedType: "PLAN",
          relatedId: payload.planId,
          sourceType: (event.sourceType as AuditType | undefined) || undefined,
          sourceId: event.sourceId || undefined,
          title: request.title,
          before: {
            request: requestSnapshot(request),
            linked: true,
            draftLinks: payload.draftLinks,
          },
          after: {
            request: requestSnapshot(updated),
            linked: !payload.linkCreated,
            removedDraftLinks: payload.draftLinks,
          },
          undoOfId: event.id,
          reason: explanation,
        });
      }
      await tx.$queryRaw`SELECT id FROM comment_reviews WHERE id = ${payload.reviewId} FOR UPDATE`;
      const review = await tx.commentReview.findUniqueOrThrow({
        where: { id: payload.reviewId },
      });
      const edge = await tx.commentReviewRequest.findUnique({
        where: {
          reviewId_proposalKey: {
            reviewId: review.id,
            proposalKey: payload.proposalKey,
          },
        },
      });
      if (!edge || edge.requestId !== payload.requestId)
        throw new Error(
          "The comment source has already been reassigned. Reload its current record.",
        );
      const proposal = commentProposalsSchema
        .parse(review.proposals)
        .find((p) => p.key === payload.proposalKey);
      if (!proposal)
        throw new Error(
          "The original reviewed proposal is unavailable. No changes were made.",
        );
      const request = await tx.songRequest.create({
        data: {
          title: proposal.title,
          artist: proposal.sourceArtists || null,
          origin: proposal.from || null,
          sourceUrl: proposal.sourceUrl || null,
          ideas: proposal.requestedChanges || null,
          channel: "YOUTUBE_COMMENT",
          status: "PENDING",
        },
      });
      await tx.commentReviewRequest.update({
        where: {
          reviewId_proposalKey: {
            reviewId: review.id,
            proposalKey: proposal.key,
          },
        },
        data: { requestId: request.id },
      });
      await tx.commentReview.update({
        where: { id: review.id },
        data: { replyApprovedAt: null, version: { increment: 1 } },
      });
      return writeAudit(tx, {
        actor,
        action: "MERGE_UNDONE",
        entityType: "COMMENT",
        entityId: review.id,
        relatedType: "REQUEST",
        relatedId: payload.requestId,
        sourceType: "REQUEST",
        sourceId: request.id,
        title: proposal.title,
        before: {
          requestId: payload.requestId,
          replyApprovedAt: review.replyApprovedAt,
        },
        after: {
          requestId: request.id,
          status: "PENDING",
          replyApprovedAt: null,
          sourceUrl: review.sourceUrl,
        },
        undoOfId: event.id,
        reason: explanation,
      });
    },
    { timeout: 20000 },
  );
}

export async function listReviewAudit(
  type?: string,
  id?: string,
  page = 1,
  eventId?: string,
) {
  const validType =
    type && AUDIT_TYPES.includes(type as AuditType) ? type : undefined;
  const where: Prisma.ReviewAuditEventWhereInput = eventId
    ? { OR: [{ id: eventId }, { undoOfId: eventId }] }
    : validType || id
      ? {
          OR: [
            {
              ...(validType ? { entityType: validType } : {}),
              ...(id ? { entityId: id } : {}),
            },
            {
              ...(validType ? { relatedType: validType } : {}),
              ...(id ? { relatedId: id } : {}),
            },
            {
              ...(validType ? { sourceType: validType } : {}),
              ...(id ? { sourceId: id } : {}),
            },
          ],
        }
      : {};
  const [events, total] = await Promise.all([
    auditDb().reviewAuditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 30,
      take: 30,
    }),
    auditDb().reviewAuditEvent.count({ where }),
  ]);
  const undone = await auditDb().reviewAuditEvent.findMany({
    where: { undoOfId: { in: events.map((e) => e.id) } },
    select: { undoOfId: true, id: true },
  });
  return {
    events: events.map((e) => ({
      ...e,
      undoneBy: undone.find((u) => u.undoOfId === e.id)?.id || null,
    })),
    total,
  };
}
