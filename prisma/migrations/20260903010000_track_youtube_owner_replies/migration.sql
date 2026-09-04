ALTER TABLE "admin_youtube_comments"
  ADD COLUMN "hasOwnerReply" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ownerReplyCheckedAt" TIMESTAMP(3);

CREATE INDEX "admin_youtube_comments_hasOwnerReply_ownerReplyCheckedAt_idx"
  ON "admin_youtube_comments"("hasOwnerReply", "ownerReplyCheckedAt");

-- Revisit comment history once so existing owner replies and previously
-- excluded owner-authored comments are collected by the new sync behavior.
UPDATE "admin_youtube_comment_syncs"
SET
  "lastCommentPublishedAt" = NULL,
  "nextPageToken" = NULL,
  "pendingNewestPublishedAt" = NULL,
  "message" = 'Owner reply detection backfill is queued.',
  "status" = 'idle';
