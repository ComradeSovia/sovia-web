import { getPrismaClient } from "@sovia/sound/data/prisma";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  auditPlanChange,
  planSnapshot,
  requestSnapshot,
  writeAudit,
} from "./review-audit";

export const REQUEST_STATUSES = [
  "PENDING",
  "NEEDS_INFO",
  "ACCEPTED",
  "REJECTED",
  "ARCHIVED",
] as const;
export const PLAN_STATUSES = [
  "PROPOSED",
  "PLANNING",
  "IN_PRODUCTION",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;
export const WORK_MATCHES = ["FULL", "PARTIAL", "RELATED"] as const;
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);
export const referenceUrl = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .transform((value) => value ?? "")
  .refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Use an http(s) reference URL.")
  .transform((value) => value || null);

export const planFields = z.object({
  title: z.string().trim().min(1).max(300),
  from: optionalText(500),
  sourceArtists: optionalText(1000),
  sourceUrl: referenceUrl,
  notes: optionalText(4000),
});

export function planningPrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");
  return prisma;
}

export function listSongRequests(status?: string, q?: string, page = 1) {
  const where: Prisma.SongRequestWhereInput = {
    ...(REQUEST_STATUSES.includes(status as (typeof REQUEST_STATUSES)[number])
      ? { status: status as (typeof REQUEST_STATUSES)[number] }
      : {}),
    ...(q
      ? {
          OR: ["title", "artist", "origin"].map((field) => ({
            [field]: { contains: q, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const prisma = planningPrisma();
  return Promise.all([
    prisma.songRequest.findMany({
      where,
      include: { plans: { include: { plan: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 30,
      skip: (page - 1) * 30,
    }),
    prisma.songRequest.count({ where }),
  ]);
}

export async function getSongRequest(id: string) {
  return planningPrisma().songRequest.findUnique({
    where: { id },
    include: {
      plans: { include: { plan: true } },
      sourceDraft: {
        select: {
          id: true,
          sourceName: true,
          sourceText: true,
          proposals: true,
        },
      },
      planningDrafts: { select: { id: true, sourceName: true, status: true } },
      commentSources: {
        include: {
          review: { select: { id: true, sourceUrl: true, sourceText: true } },
        },
      },
    },
  });
}

// Suggest matches; never auto-merge songs sharing a title or reference.
export async function findRequestMatches(request: {
  title: string;
  sourceUrl: string | null;
}) {
  const prisma = planningPrisma();
  const title = request.title.trim();
  return Promise.all([
    prisma.adminMusicTodo.findMany({
      where: {
        OR: [
          { title: { contains: title, mode: "insensitive" } },
          ...(request.sourceUrl ? [{ sourceUrl: request.sourceUrl }] : []),
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        works: {
          include: { work: { include: { content: true, status: true } } },
        },
      },
    }),
    prisma.musicWork.findMany({
      where: {
        OR: [
          { content: { songTitle: { contains: title, mode: "insensitive" } } },
          { source: { title: { contains: title, mode: "insensitive" } } },
        ],
      },
      include: { content: true, status: true, source: true },
      take: 10,
    }),
  ]);
}

export async function reviewSongRequest(
  input: {
    id: string;
    updatedAt: string;
    decision: (typeof REQUEST_STATUSES)[number];
    reviewNotes: string | null;
    planId: string;
    draft: z.infer<typeof planFields>;
  },
  actor = "system",
) {
  const prisma = planningPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM song_requests WHERE id = ${input.id} FOR UPDATE`;
    const previous = await tx.songRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: { plans: true },
    });
    // Optimistic claim prevents duplicate plans from retries/concurrent approvals.
    const claimed = await tx.songRequest.updateMany({
      where: { id: input.id, updatedAt: new Date(input.updatedAt) },
      data: {
        status: input.decision,
        reviewNotes: input.reviewNotes,
        reviewedAt: new Date(),
      },
    });
    if (!claimed.count)
      throw new Error(
        "This request changed. Reload it before reviewing again.",
      );
    if (input.decision !== "ACCEPTED") {
      const after = await tx.songRequest.findUniqueOrThrow({
        where: { id: input.id },
      });
      await writeAudit(tx, {
        actor,
        action: "REQUEST_REVIEWED",
        entityType: "REQUEST",
        entityId: input.id,
        title: previous.title,
        before: requestSnapshot(previous),
        after: requestSnapshot(after),
      });
      return null;
    }
    const current = await tx.songRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: { plans: true },
    });
    let planId = input.planId;
    let planBefore: Awaited<ReturnType<typeof tx.adminMusicTodo.findUnique>> =
      null;
    if (!planId && current.plans.length)
      throw new Error(
        "This request already has a plan. Select an existing plan or reload.",
      );
    if (planId) {
      const plan = await tx.adminMusicTodo.findUnique({
        where: { id: planId },
      });
      planBefore = plan;
      if (!plan || plan.status === "CANCELLED")
        throw new Error("Select an existing, non-cancelled plan.");
    } else {
      const plan = await tx.adminMusicTodo.create({
        data: {
          ...planFields.parse(input.draft),
          status: "PLANNING",
          visible: false,
        },
      });
      planId = plan.id;
    }
    const edge = await tx.songRequestPlan.upsert({
      where: { requestId_planId: { requestId: input.id, planId } },
      create: { requestId: input.id, planId },
      update: {},
    });
    await tx.adminMusicTodo.updateMany({
      where: { id: planId, status: "PROPOSED" },
      data: { status: "PLANNING" },
    });
    await auditPlanChange(
      tx,
      planId,
      planBefore,
      actor,
      planBefore ? "PLAN_UPDATED" : "PLAN_CREATED",
    );
    const after = await tx.songRequest.findUniqueOrThrow({
      where: { id: input.id },
    });
    const linkCreated = !previous.plans.some((l) => l.planId === planId);
    await writeAudit(tx, {
      actor,
      action:
        input.planId && linkCreated ? "REQUEST_MERGED" : "REQUEST_REVIEWED",
      entityType: "REQUEST",
      entityId: input.id,
      relatedType: "PLAN",
      relatedId: planId,
      title: previous.title,
      before: { request: requestSnapshot(previous), linked: !linkCreated },
      after: { request: requestSnapshot(after), linked: true },
      undo:
        input.planId && linkCreated
          ? {
              kind: "request-plan",
              requestId: input.id,
              planId,
              edgeAt: edge.createdAt.toISOString(),
              linkCreated: true,
              draftLinks: [],
            }
          : {},
    });
    return planId;
  });
}

export async function refreshPlanCompletion(
  tx: Prisma.TransactionClient,
  planId: string,
  reopenIfUnfulfilled = false,
  actor = "system",
) {
  await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${planId} FOR UPDATE`;
  const plan = await tx.adminMusicTodo.findUniqueOrThrow({
    where: { id: planId },
    include: { works: { include: { work: { include: { status: true } } } } },
  });
  const fulfilled = plan.works.some(
    (link) =>
      link.match === "FULL" &&
      link.work.status?.visible &&
      link.work.status.publishedAt?.trim(),
  );
  // Keep historical completion when a Work is withdrawn. Availability is separate.
  if (fulfilled && plan.status !== "CANCELLED" && plan.status !== "COMPLETED") {
    await tx.adminMusicTodo.update({
      where: { id: planId },
      data: {
        status: "COMPLETED",
        completedAt: plan.completedAt ?? new Date(),
      },
    });
  }
  if (!fulfilled && reopenIfUnfulfilled && plan.status === "COMPLETED") {
    await tx.adminMusicTodo.update({
      where: { id: planId },
      data: { status: "PLANNING", completedAt: null },
    });
  }
  await auditPlanChange(tx, planId, plan, actor, "PLAN_COMPLETION_CHANGED");
}

export async function linkPlanWork(
  input: {
    planId: string;
    contentId: string;
    match: (typeof WORK_MATCHES)[number];
    notes: string | null;
  },
  actor = "system",
) {
  return planningPrisma().$transaction(async (tx) => {
    // Serialize association edits with the plan editor and invalidate stale forms.
    await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${input.planId} FOR UPDATE`;
    const planBefore = await tx.adminMusicTodo.findUniqueOrThrow({
      where: { id: input.planId },
    });
    const previous = await tx.musicPlanWork.findUnique({
      where: {
        planId_contentId: { planId: input.planId, contentId: input.contentId },
      },
    });
    await tx.musicWork.findUniqueOrThrow({
      where: { contentId: input.contentId },
    });
    await tx.musicPlanWork.upsert({
      where: {
        planId_contentId: { planId: input.planId, contentId: input.contentId },
      },
      create: input,
      update: { match: input.match, notes: input.notes },
    });
    await tx.adminMusicTodo.update({
      where: { id: input.planId },
      data: {
        updatedAt: new Date(),
      },
    });
    await refreshPlanCompletion(
      tx,
      input.planId,
      previous?.match === "FULL" && input.match !== "FULL",
      actor,
    );
    const planAfter = await tx.adminMusicTodo.findUniqueOrThrow({
      where: { id: input.planId },
    });
    await writeAudit(tx, {
      actor,
      action: previous ? "WORK_LINK_UPDATED" : "WORK_LINKED",
      entityType: "PLAN",
      entityId: input.planId,
      relatedType: "WORK",
      relatedId: input.contentId,
      title: planAfter.title,
      before: {
        plan: planSnapshot(planBefore),
        link: previous && { match: previous.match, notes: previous.notes },
      },
      after: {
        plan: planSnapshot(planAfter),
        link: { match: input.match, notes: input.notes },
      },
    });
  });
}
