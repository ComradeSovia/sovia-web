"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuditActor } from "./data/auth";
import { undoReviewMerge } from "./data/review-audit";

export async function undoReviewMergeAction(form: FormData) {
  const actor = await requireAuditActor();
  const eventId = z.string().min(1).max(300).parse(form.get("eventId"));
  let message = "Merge undone. Original sources were preserved.";
  let status = "success";
  try {
    if (form.get("confirmed") !== "on")
      throw new Error("Review and confirm the merge undo first.");
    const reason = z.string().trim().min(1).max(1000).parse(form.get("reason"));
    await undoReviewMerge(eventId, reason, actor);
  } catch (error) {
    status = "error";
    message =
      error instanceof z.ZodError
        ? "Enter a reason (up to 1000 characters)."
        : error instanceof Error
          ? error.message
          : "The merge could not be undone.";
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/song-plans", "layout");
  redirect(
    `/admin/review/history?${new URLSearchParams({ event: eventId, status, message })}#event-${encodeURIComponent(eventId)}`,
  );
}
