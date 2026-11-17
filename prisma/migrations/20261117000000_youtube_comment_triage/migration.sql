CREATE TYPE "YoutubeCommentCategory" AS ENUM ('UNCLASSIFIED', 'SONG_REQUEST', 'QUESTION', 'FEEDBACK', 'OTHER');
CREATE TYPE "YoutubeReplyAdvice" AS ENUM ('UNDECIDED', 'REPLY', 'SKIP');

ALTER TABLE "admin_youtube_comments"
  ADD COLUMN "categoryOverride" "YoutubeCommentCategory",
  ADD COLUMN "noReplyAt" TIMESTAMP(3),
  ADD COLUMN "triageVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "comment_reviews"
  ADD COLUMN "category" "YoutubeCommentCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "replyAdvice" "YoutubeReplyAdvice" NOT NULL DEFAULT 'UNDECIDED';

-- Existing links and extracted songs are evidence of a request. A missing
-- proposal or dismissed snapshot does not establish a creator's reply choice.
UPDATE "comment_reviews" r
SET "category" = 'SONG_REQUEST'
WHERE (CASE WHEN jsonb_typeof(r."proposals") = 'array' THEN jsonb_array_length(r."proposals") ELSE 0 END) > 0
   OR EXISTS (SELECT 1 FROM "comment_review_requests" e WHERE e."reviewId" = r.id);
