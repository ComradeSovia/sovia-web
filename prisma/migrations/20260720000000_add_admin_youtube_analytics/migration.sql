CREATE TABLE "admin_youtube_analytics_syncs" (
  "id" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncedAt" TIMESTAMP(3),
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "videoCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "message" TEXT,

  CONSTRAINT "admin_youtube_analytics_syncs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_youtube_video_analytics_snapshots" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "periodDays" INTEGER NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "estimatedMinutesWatched" DOUBLE PRECISION,
  "averageViewDuration" DOUBLE PRECISION,
  "averageViewPercentage" DOUBLE PRECISION,
  "subscribersGained" INTEGER NOT NULL DEFAULT 0,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "comments" INTEGER NOT NULL DEFAULT 0,
  "shares" INTEGER NOT NULL DEFAULT 0,
  "impressions" INTEGER,
  "impressionClickThroughRate" DOUBLE PRECISION,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_youtube_video_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_youtube_video_analytics_snapshots_videoId_periodDays_endDate_key"
  ON "admin_youtube_video_analytics_snapshots"("videoId", "periodDays", "endDate");

CREATE INDEX "admin_youtube_video_analytics_snapshots_contentId_idx"
  ON "admin_youtube_video_analytics_snapshots"("contentId");

CREATE INDEX "admin_youtube_video_analytics_snapshots_periodDays_endDate_idx"
  ON "admin_youtube_video_analytics_snapshots"("periodDays", "endDate");

ALTER TABLE "admin_youtube_video_analytics_snapshots"
  ADD CONSTRAINT "admin_youtube_video_analytics_snapshots_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE CASCADE ON UPDATE CASCADE;
