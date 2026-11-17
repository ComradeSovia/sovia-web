import { saveCommentTriageAction } from "../comment-review-actions";
import { COMMENT_CATEGORIES as categories } from "../model/comment-review";
import {
  categoryLabel,
  replyStatusLabel,
} from "../model/comment-triage-labels";
import { SelectField } from "./admin-content";
import { AdminDirtyForm } from "./admin-step-panels";
import { PlanningSubmit } from "./planning-submit";

export function CommentTriageEditor({
  comment,
  sourceHash,
  returnTo,
}: {
  comment: {
    id: string;
    categoryOverride: keyof typeof categoryLabel | null;
    noReplyAt: Date | null;
    triageVersion: number;
    hasOwnerReply: boolean;
  };
  sourceHash: string;
  returnTo: string;
}) {
  return (
    <details className="rounded-md border border-zinc-800 px-3 py-2 text-sm">
      <summary className="cursor-pointer text-zinc-300">
        Edit category and reply decision
      </summary>
      <AdminDirtyForm
        key={`${comment.id}:${comment.triageVersion}`}
        action={saveCommentTriageAction}
        className="mt-3 grid gap-3"
      >
        <input type="hidden" name="commentId" value={comment.id} />
        <input type="hidden" name="sourceHash" value={sourceHash} />
        <input
          type="hidden"
          name="triageVersion"
          value={comment.triageVersion}
        />
        <input type="hidden" name="returnTo" value={returnTo} />
        <SelectField
          controlId={`category-${comment.id}`}
          label="Category"
          name="categoryOverride"
          value={comment.categoryOverride ?? "AUTO"}
          options={[
            { value: "AUTO", label: "Use reviewed category" },
            ...categories.map((value) => ({
              value,
              label: categoryLabel[value],
            })),
          ]}
        />
        {!comment.hasOwnerReply && (
          <SelectField
            controlId={`reply-decision-${comment.id}`}
            label="Reply decision"
            name="noReply"
            value={comment.noReplyAt ? "true" : "false"}
            options={[
              { value: "false", label: "Open for reply" },
              { value: "true", label: replyStatusLabel.NO_REPLY },
            ]}
          />
        )}
        <div>
          <PlanningSubmit>Save decision</PlanningSubmit>
        </div>
      </AdminDirtyForm>
    </details>
  );
}
