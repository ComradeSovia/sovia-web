import { z } from "zod";
import { generatedProposalSchema } from "./planning-proposals";

export const COMMENT_CATEGORIES = [
  "UNCLASSIFIED",
  "SONG_REQUEST",
  "QUESTION",
  "FEEDBACK",
  "OTHER",
] as const;
export const REPLY_ADVICE = ["UNDECIDED", "REPLY", "SKIP"] as const;
export const COMMENT_REPLY_STATES = [
  "UNREPLIED",
  "DRAFTED",
  "REPLIED",
  "NO_REPLY",
] as const;
const commentIdentity = {
  commentId: z.string().min(1).max(300),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  triageVersion: z.number().int().nonnegative(),
};
export const linkCommentRequestSchema = z
  .object({
    ...commentIdentity,
    requestId: z.string().min(1).max(300),
  })
  .strict();
export const MANUAL_SOURCE_MODEL = "manual-source-link";
export const commentTriageSchema = z
  .object({
    ...commentIdentity,
    categoryOverride: z.enum(COMMENT_CATEGORIES).nullable().optional(),
    noReply: z.boolean().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.categoryOverride !== undefined || input.noReply !== undefined,
    "Choose a category or a reply decision.",
  );

export const commentProposalSchema = generatedProposalSchema.extend({
  key: z.string().min(1).max(100),
  decision: z.enum(["create", "attach", "skip"]),
  target: z.string().max(300),
  allowDuplicate: z.boolean(),
});
export const commentProposalsSchema = z.array(commentProposalSchema).max(5);
export const commentPreviewSchema = z.object({
  commentId: z.string().min(1).max(300),
  sourceHash: z.string().length(64),
  sourceText: z.string().min(1).max(20000),
  sourceUrl: z.url().max(2000),
  sourceVersion: z.iso.datetime(),
  ownerChannelId: z.string().min(1).max(200),
  ownerReplyCheckedAt: z.iso.datetime(),
  proposals: commentProposalsSchema,
  replyText: z.string().max(4000),
  replyBlockedReason: z.enum(["REPLIED", "NO_REPLY"]).nullable().optional(),
  rationale: z.string().max(4000),
  category: z.enum(COMMENT_CATEGORIES).default("UNCLASSIFIED"),
  replyAdvice: z.enum(REPLY_ADVICE).default("UNDECIDED"),
  model: z.string().max(100),
  promptKey: z.string().max(200),
});
export const commentBatchSchema = z.object({
  items: z.array(commentPreviewSchema).max(5),
  skipped: z
    .array(
      z.object({
        commentId: z.string(),
        reason: z.string(),
        reviewId: z.string().optional(),
      }),
    )
    .max(205),
});
export type CommentPreview = z.infer<typeof commentPreviewSchema>;
export function youtubeCommentUrl(comment: { videoId: string; id: string }) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(comment.videoId)}&lc=${encodeURIComponent(comment.id)}`;
}
