"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuditActor } from "./data/auth";
import {
  approveCommentReview,
  approveSavedReply,
  dismissCommentReview,
  linkCommentRequest,
  updateCommentReview,
  updateCommentTriage,
  updateReviewedReply,
} from "./data/comment-reviews";
import { nextReviewPath } from "./data/review-inbox";
import { planningPrisma } from "./data/song-requests";
import { refreshAdminYoutubeComment } from "./data/youtube-comments";
import {
  commentProposalsSchema,
  commentTriageSchema,
  linkCommentRequestSchema,
} from "./model/comment-review";
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

export async function linkCommentRequestAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = z.string().min(1).max(300).parse(text(form, "commentId"));
  const query = new URLSearchParams({ commentId: id });
  try {
    if (form.get("confirmed") !== "on")
      throw new Error("Confirm the comment and song request first.");
    const input = linkCommentRequestSchema.parse({
      commentId: id,
      requestId: text(form, "requestId"),
      sourceHash: text(form, "sourceHash"),
      triageVersion: triageVersionOf(form),
    });
    const result = await linkCommentRequest(input, actor);
    for (const path of [
      "/admin",
      "/admin/review",
      "/admin/comments",
      "/admin/comment-reviews",
      "/admin/requests",
      `/admin/comment-reviews/${result.reviewId}`,
      `/admin/requests/${result.requestId}`,
    ])
      revalidatePath(path);
    query.set("status", "success");
    query.set("message", "Song request linked to the original comment.");
  } catch (error) {
    query.set("status", "error");
    query.set(
      "message",
      error instanceof z.ZodError
        ? "Check the selected song request and refresh the comment."
        : error instanceof Error
          ? error.message
          : "Unable to link song request.",
    );
  }
  redirect(`/admin/comments?${query}`);
}

export async function saveCommentTriageAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = z.string().min(1).max(300).parse(text(form, "commentId"));
  const href = new URL("/admin/comments", "https://local.invalid");
  const target = text(form, "returnTo");
  if (target.startsWith("/admin/comments?") || target === "/admin/comments") {
    const params = new URL(target, href).searchParams;
    for (const key of [
      "category",
      "replyStatus",
      "commentId",
      "q",
      "page",
      "hideOwn",
      "hideReplied",
      "candidate",
      "unlinked",
    ]) {
      const value = params.get(key);
      if (value) href.searchParams.set(key, value);
    }
    href.hash = `comment-${encodeURIComponent(id)}`;
  } else if (/^\/admin\/comment-reviews\/[a-zA-Z0-9_-]+$/.test(target)) {
    href.pathname = target;
  }
  try {
    const category = text(form, "categoryOverride");
    const input = commentTriageSchema.parse({
      commentId: id,
      sourceHash: text(form, "sourceHash"),
      triageVersion: triageVersionOf(form),
      categoryOverride: category === "AUTO" ? null : category,
      ...(form.has("noReply")
        ? {
            noReply:
              z.enum(["true", "false"]).parse(text(form, "noReply")) === "true",
          }
        : {}),
    });
    await updateCommentTriage(input, actor);
    for (const path of [
      "/admin",
      "/admin/comments",
      "/admin/review",
      "/admin/comment-reviews",
      href.pathname,
    ])
      revalidatePath(path);
    href.searchParams.set("status", "success");
    href.searchParams.set("message", "Comment decision saved.");
  } catch (error) {
    href.searchParams.set("status", "error");
    href.searchParams.set(
      "message",
      error instanceof z.ZodError
        ? "Invalid decision. Reload this comment and try again."
        : error instanceof Error
          ? error.message
          : "Could not save comment decision.",
    );
  }
  redirect(href.pathname + href.search + href.hash);
}

function triageVersionOf(form: FormData) {
  return z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .parse(form.get("triageVersion"));
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
