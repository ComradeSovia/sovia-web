ALTER TABLE "admin_youtube_comment_syncs"
  ADD COLUMN "nextPageToken" TEXT,
  ADD COLUMN "pendingNewestPublishedAt" TIMESTAMP(3);

-- The previous implementation advanced its watermark after a capped fetch, so
-- an old high-volume interval may contain gaps. Re-run one resumable backfill;
-- comment upserts make this safe for rows that are already stored.
UPDATE "admin_youtube_comment_syncs"
SET
  "lastCommentPublishedAt" = NULL,
  "message" = 'A resumable comment history backfill is queued.',
  "status" = 'idle';
