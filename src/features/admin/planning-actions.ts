"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuditActor } from "./data/auth";
import {
  auditPlanChange,
  planSnapshot,
  requestSnapshot,
  writeAudit,
} from "./data/review-audit";
import { nextReviewPath } from "./data/review-inbox";
import {
  linkPlanWork,
  PLAN_STATUSES,
  planFields,
  planningPrisma,
  REQUEST_STATUSES,
  refreshPlanCompletion,
  reviewSongRequest,
  WORK_MATCHES,
} from "./data/song-requests";

function text(form: FormData, key: string) {
  return z
    .string()
    .parse(form.get(key) ?? "")
    .trim();
}
function id(form: FormData, key: string) {
  return z.string().min(1).max(300).parse(text(form, key));
}
function version(form: FormData) {
  return z.iso.datetime().parse(text(form, "updatedAt"));
}
function draft(form: FormData) {
  return planFields.parse(
    Object.fromEntries(
      ["title", "from", "sourceArtists", "sourceUrl", "notes"].map((key) => [
        key,
        text(form, key),
      ]),
    ),
  );
}
function done(path: string, error?: unknown, successMessage?: string): never {
  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/todo");
  revalidatePath(path);
  const message =
    error instanceof z.ZodError
      ? "Check the required fields, lengths and reference URL."
      : error instanceof Error
        ? error.message
        : (successMessage ?? "Saved.");
  redirect(
    `${path}?status=${error ? "error" : "success"}&message=${encodeURIComponent(message)}`,
  );
}

export async function reviewRequestAction(form: FormData) {
  const actor = await requireAuditActor();
  const requestId = id(form, "requestId");
  const path = `/admin/requests/${encodeURIComponent(requestId)}`;
  let planId: string | null = null;
  try {
    const decision = z.enum(REQUEST_STATUSES).parse(text(form, "decision"));
    const selectedPlan = text(form, "planId");
    planId = await reviewSongRequest(
      {
        id: requestId,
        updatedAt: version(form),
        decision,
        reviewNotes:
          z.string().max(4000).parse(text(form, "reviewNotes")) || null,
        planId: selectedPlan,
        draft:
          decision === "ACCEPTED" && !selectedPlan
            ? draft(form)
            : {
                title: "",
                from: null,
                sourceArtists: null,
                sourceUrl: null,
                notes: null,
              },
      },
      actor,
    );
  } catch (error) {
    done(path, error);
  }
  if (form.get("next") === "on")
    done(
      await nextReviewPath("requests", requestId),
      undefined,
      "Previous recommendation saved. Continue reviewing the inbox.",
    );
  if (planId) done(`/admin/todo/${encodeURIComponent(planId)}`);
  done(path);
}

export async function savePlanAction(form: FormData) {
  const actor = await requireAuditActor();
  const planId = id(form, "planId");
  const path = `/admin/todo/${encodeURIComponent(planId)}`;
  try {
    const input = draft(form);
    const publicSummary =
      z.string().max(2000).parse(text(form, "publicSummary")) || null;
    const status = z.enum(PLAN_STATUSES).parse(text(form, "planStatus"));
    await planningPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${planId} FOR UPDATE`;
      const current = await tx.adminMusicTodo.findUniqueOrThrow({
        where: { id: planId },
        include: {
          works: { include: { work: { include: { status: true } } } },
        },
      });
      if (
        status === "COMPLETED" &&
        current.status !== "COMPLETED" &&
        !current.works.some(
          (link) =>
            link.match === "FULL" &&
            link.work.status?.visible &&
            link.work.status.publishedAt?.trim(),
        )
      ) {
        throw new Error(
          "Completion requires a fully matching, visible and published Work.",
        );
      }
      const result = await tx.adminMusicTodo.updateMany({
        where: { id: planId, updatedAt: new Date(version(form)) },
        data: {
          ...input,
          publicSummary,
          status,
          visible: text(form, "visible") === "true",
          completedAt:
            status === "COMPLETED" ? (current.completedAt ?? new Date()) : null,
        },
      });
      if (!result.count)
        throw new Error("This plan changed. Reload before saving.");
      await auditPlanChange(tx, planId, current, actor);
    });
  } catch (error) {
    done(path, error);
  }
  done(path);
}

export async function linkWorkAction(form: FormData) {
  const actor = await requireAuditActor();
  const planId = id(form, "planId");
  const path = `/admin/todo/${encodeURIComponent(planId)}`;
  try {
    await linkPlanWork(
      {
        planId,
        contentId: id(form, "contentId"),
        match: z.enum(WORK_MATCHES).parse(text(form, "match")),
        notes: z.string().max(2000).parse(text(form, "linkNotes")) || null,
      },
      actor,
    );
  } catch (error) {
    done(path, error);
  }
  done(path);
}

export async function unlinkWorkAction(form: FormData) {
  const actor = await requireAuditActor();
  const planId = id(form, "planId");
  const path = `/admin/todo/${encodeURIComponent(planId)}`;
  try {
    const contentId = id(form, "contentId");
    await planningPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${planId} FOR UPDATE`;
      const beforePlan = await tx.adminMusicTodo.findUniqueOrThrow({
        where: { id: planId },
      });
      const beforeLink = await tx.musicPlanWork.findUniqueOrThrow({
        where: { planId_contentId: { planId, contentId } },
      });
      await tx.musicPlanWork.delete({
        where: { planId_contentId: { planId, contentId } },
      });
      await tx.adminMusicTodo.updateMany({
        where: { id: planId, contentId },
        data: { contentId: null },
      });
      await refreshPlanCompletion(tx, planId, true, actor);
      await tx.adminMusicTodo.update({
        where: { id: planId },
        data: { updatedAt: new Date() },
      });
      const afterPlan = await tx.adminMusicTodo.findUniqueOrThrow({
        where: { id: planId },
      });
      await writeAudit(tx, {
        actor,
        action: "WORK_DETACHED",
        entityType: "PLAN",
        entityId: planId,
        relatedType: "WORK",
        relatedId: contentId,
        title: afterPlan.title,
        before: {
          plan: planSnapshot(beforePlan),
          link: { match: beforeLink.match, notes: beforeLink.notes },
        },
        after: { plan: planSnapshot(afterPlan), link: null },
      });
    });
  } catch (error) {
    done(path, error);
  }
  done(path);
}

export async function detachRequestAction(form: FormData) {
  const actor = await requireAuditActor();
  const requestId = id(form, "requestId");
  const path = `/admin/requests/${encodeURIComponent(requestId)}`;
  try {
    await planningPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM song_requests WHERE id = ${requestId} FOR UPDATE`;
      const beforeRequest = await tx.songRequest.findUniqueOrThrow({
        where: { id: requestId },
      });
      const planId = id(form, "planId");
      await tx.songRequestPlan.delete({
        where: { requestId_planId: { requestId, planId: id(form, "planId") } },
      });
      const remaining = await tx.songRequestPlan.count({
        where: { requestId },
      });
      await tx.songRequest.update({
        where: { id: requestId },
        data: {
          updatedAt: new Date(),
          ...(!remaining ? { status: "PENDING", reviewedAt: null } : {}),
        },
      });
      const afterRequest = await tx.songRequest.findUniqueOrThrow({
        where: { id: requestId },
      });
      await writeAudit(tx, {
        actor,
        action: "REQUEST_DETACHED",
        entityType: "REQUEST",
        entityId: requestId,
        relatedType: "PLAN",
        relatedId: planId,
        title: afterRequest.title,
        before: { request: requestSnapshot(beforeRequest), linked: true },
        after: { request: requestSnapshot(afterRequest), linked: false },
      });
    });
  } catch (error) {
    done(path, error);
  }
  done(path);
}
