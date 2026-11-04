CREATE TABLE "comment_reviews" (
  "id" TEXT PRIMARY KEY,
  "commentId" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceVersion" TIMESTAMP(3) NOT NULL,
  "ownerChannelId" TEXT NOT NULL,
  "proposals" JSONB NOT NULL,
  "replyText" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "reviewedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "replyApprovedAt" TIMESTAMP(3),
  "copiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "comment_reviews_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "admin_youtube_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "comment_reviews_commentId_sourceHash_key" ON "comment_reviews"("commentId", "sourceHash");
CREATE INDEX "comment_reviews_reviewedAt_createdAt_idx" ON "comment_reviews"("reviewedAt", "createdAt");
CREATE TABLE "comment_review_requests" (
  "reviewId" TEXT NOT NULL,
  "proposalKey" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  PRIMARY KEY ("reviewId", "proposalKey"),
  CONSTRAINT "comment_review_requests_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "comment_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "comment_review_requests_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "song_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "comment_review_requests_requestId_idx" ON "comment_review_requests"("requestId");
