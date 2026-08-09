CREATE TABLE "admin_youtube_comment_syncs" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "channelId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "message" TEXT,
  "lastCommentPublishedAt" TIMESTAMP(3),
  "pagesFetched" INTEGER NOT NULL DEFAULT 0,
  "commentsSynced" INTEGER NOT NULL DEFAULT 0,
  "quotaUnits" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "syncedAt" TIMESTAMP(3),

  CONSTRAINT "admin_youtube_comment_syncs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_youtube_comments" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "authorChannelId" TEXT,
  "authorDisplayName" TEXT NOT NULL,
  "authorProfileImageUrl" TEXT,
  "text" TEXT NOT NULL,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "replyCount" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_youtube_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_youtube_comments_contentId_publishedAt_idx"
  ON "admin_youtube_comments"("contentId", "publishedAt");

CREATE INDEX "admin_youtube_comments_videoId_publishedAt_idx"
  ON "admin_youtube_comments"("videoId", "publishedAt");

CREATE INDEX "admin_youtube_comments_publishedAt_idx"
  ON "admin_youtube_comments"("publishedAt");

ALTER TABLE "admin_youtube_comments"
  ADD CONSTRAINT "admin_youtube_comments_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
  ON DELETE CASCADE ON UPDATE CASCADE;
