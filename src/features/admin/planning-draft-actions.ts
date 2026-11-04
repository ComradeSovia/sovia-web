"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuditActor } from "./data/auth";
import {
  adoptPlanningDraft,
  refreshPlanningDraftRequest,
  updatePlanningDraft,
} from "./data/planning-drafts";
import { nextReviewPath } from "./data/review-inbox";
import { planningPrisma } from "./data/song-requests";
import {
  proposalFields,
  reviewedProposalsSchema,
} from "./model/planning-proposals";

function text(form: FormData, name: string) {
  return z
    .string()
    .parse(form.get(name) ?? "")
    .trim();
}
function draftId(form: FormData) {
  return z.string().min(1).max(300).parse(text(form, "draftId"));
}
function version(form: FormData) {
  return z.coerce.number().int().positive().parse(form.get("version"));
}
function finish(id: string, error?: unknown, destination?: string): never {
  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/admin/planning-drafts");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/todo");
  revalidatePath(`/admin/planning-drafts/${id}`);
  const message =
    error instanceof z.ZodError
      ? "Check field lengths and the reference URL. The draft was not changed."
      : error instanceof Error
        ? error.message
        : destination
          ? "Previous action completed. Continue reviewing the inbox."
          : "Saved.";
  redirect(
    `${destination ?? `/admin/planning-drafts/${encodeURIComponent(id)}`}?status=${error ? "error" : "success"}&message=${encodeURIComponent(message)}`,
  );
}
export async function savePlanningDraftAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = draftId(form);
  try {
    const current = await planningPrisma().musicPlanningDraft.findUniqueOrThrow(
      { where: { id } },
    );
    const original = reviewedProposalsSchema.parse(current.proposals);
    const proposals = original.map((proposal) => ({
      ...proposal,
      ...Object.fromEntries(
        Object.keys(proposalFields).map((field) => [
          field,
          text(form, `${field}-${proposal.key}`),
        ]),
      ),
      decision: text(form, `decision-${proposal.key}`),
      target: text(form, `target-${proposal.key}`),
      allowDuplicate: form.get(`allowDuplicate-${proposal.key}`) === "true",
    }));
    await updatePlanningDraft(id, version(form), proposals, actor);
  } catch (error) {
    finish(id, error);
  }
  finish(
    id,
    undefined,
    form.get("next") === "on" ? await nextReviewPath("drafts", id) : undefined,
  );
}
export async function adoptPlanningDraftAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = draftId(form);
  try {
    if (form.get("confirmed") !== "on")
      throw new Error(
        "Review and confirm the saved proposals before adopting them.",
      );
    await adoptPlanningDraft(id, version(form), actor);
  } catch (error) {
    finish(id, error);
  }
  finish(
    id,
    undefined,
    form.get("next") === "on" ? await nextReviewPath("drafts", id) : undefined,
  );
}
export async function refreshPlanningDraftSourceAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = draftId(form);
  try {
    if (form.get("confirmed") !== "on")
      throw new Error(
        "Review the source request's current plans before refreshing this draft.",
      );
    await refreshPlanningDraftRequest(id, version(form), actor);
  } catch (error) {
    finish(id, error);
  }
  finish(id);
}
