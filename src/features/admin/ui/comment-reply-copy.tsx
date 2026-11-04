"use client";
import { useState } from "react";
export function CommentReplyCopy({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        className="rounded border border-zinc-600 px-4 py-2 text-sm disabled:opacity-50"
        onClick={async () => {
          if (document.querySelector('form[data-admin-dirty="true"]')) {
            setMessage(
              "Save and review your reply edits before copying the saved version.",
            );
            return;
          }
          setBusy(true);
          setMessage("");
          try {
            const response = await fetch(
              `/admin/api/comment-reviews/${encodeURIComponent(id)}/copy`,
              { method: "POST" },
            );
            const result = (await response.json()) as {
              replyText?: string;
              message?: string;
            };
            if (!response.ok || !result.replyText)
              throw new Error(result.message || "Copy unavailable.");
            await navigator.clipboard.writeText(result.replyText);
            setMessage(
              "Copied approved reply. This does not post or mark the comment as replied. Refresh after posting on YouTube.",
            );
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Copy failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Checking latest replies…"
          : "Check latest replies and copy approved draft"}
      </button>
      {message ? (
        <output className="block text-sm text-amber-200">{message}</output>
      ) : null}
    </div>
  );
}
