"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuditActor } from "./data/auth";
import {
  approveCommentReview,
  approveSavedReply,
  dismissCommentReview,
  updateCommentReview,
  updateReviewedReply,
} from "./data/comment-reviews";
import { nextReviewPath } from "./data/review-inbox";
import { planningPrisma } from "./data/song-requests";
import { refreshAdminYoutubeComment } from "./data/youtube-comments";
import { commentProposalsSchema } from "./model/comment-review";
import { proposalFields } from "./model/planning-proposals";

const text = (form: FormData, name: string) =>
  z
    .string()
    .parse(form.get(name) ?? "")
    .trim();
const idOf = (form: FormData) =>
  z.string().min(1).max(300).parse(text(form, "reviewId"));
const versionOf = (form: FormData) =>
  z.coerce.number().int().positive().parse(form.get("version"));
function finish(id: string, error?: unknown, destination?: string): never {
  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/admin/comment-reviews");
  revalidatePath("/admin/comments");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/comment-reviews/${id}`);
  const message =
    error instanceof z.ZodError
      ? "Check field lengths and URLs. Nothing was changed."
      : error instanceof Error
        ? error.message
        : destination
          ? "Previous action completed. Continue reviewing the inbox."
          : "Saved.";
  redirect(
    `${destination ?? `/admin/comment-reviews/${encodeURIComponent(id)}`}?${new URLSearchParams({ status: error ? "error" : "success", message })}`,
  );
}
export async function saveCommentReviewAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = idOf(form);
  try {
    const review = await planningPrisma().commentReview.findUniqueOrThrow({
      where: { id },
    });
    const proposals = commentProposalsSchema
      .parse(review.proposals)
      .map((p) => ({
        ...p,
        ...Object.fromEntries(
          Object.keys(proposalFields).map((key) => [
            key,
            text(form, `${key}-${p.key}`),
          ]),
        ),
        decision: text(form, `decision-${p.key}`),
        target: text(form, `target-${p.key}`),
        allowDuplicate: text(form, `allowDuplicate-${p.key}`) === "true",
      }));
    await updateCommentReview(
      id,
      versionOf(form),
      proposals,
      text(form, "replyText"),
      actor,
    );
  } catch (error) {
    finish(id, error);
  }
  finish(
    id,
    undefined,
    form.get("next") === "on"
      ? await nextReviewPath("comments", id)
      : undefined,
  );
}
export async function approveCommentReviewAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = idOf(form);
  try {
    if (form.get("confirmed") !== "on")
      throw new Error(
        "Review and confirm the saved recommendations and reply first.",
      );
    await approveCommentReview(
      id,
      versionOf(form),
      form.get("approveReply") === "on",
      undefined,
      actor,
    );
  } catch (error) {
    finish(id, error);
  }
  finish(
    id,
    undefined,
    form.get("next") === "on"
      ? await nextReviewPath("comments", id)
      : undefined,
  );
}
export async function dismissCommentReviewAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = idOf(form);
  try {
    if (form.get("confirmed") !== "on")
      throw new Error("Confirm dismissal first.");
    await dismissCommentReview(id, versionOf(form), actor);
  } catch (error) {
    finish(id, error);
  }
  finish(
    id,
    undefined,
    form.get("next") === "on"
      ? await nextReviewPath("comments", id)
      : undefined,
  );
}
export async function refreshCommentReplyAction(form: FormData) {
  await requireAuditActor();
  const id = idOf(form);
  try {
    const review = await planningPrisma().commentReview.findUniqueOrThrow({
      where: { id },
    });
    await refreshAdminYoutubeComment(review.commentId);
  } catch (error) {
    finish(id, error);
  }
  finish(id);
}

export async function saveReviewedReplyAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = idOf(form);
  try {
    await updateReviewedReply(
      id,
      versionOf(form),
      text(form, "replyText"),
      actor,
    );
  } catch (error) {
    finish(id, error);
  }
  finish(
    id,
    undefined,
    form.get("next") === "on" ? await nextReviewPath("replies", id) : undefined,
  );
}

export async function approveSavedReplyAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = idOf(form);
  try {
    if (form.get("confirmed") !== "on")
      throw new Error("Review the saved reply before approval.");
    await approveSavedReply(id, versionOf(form), undefined, actor);
  } catch (error) {
    finish(id, error);
  }
  finish(
    id,
    undefined,
    form.get("next") === "on" ? await nextReviewPath("replies", id) : undefined,
  );
}
