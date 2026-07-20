CREATE TABLE "admin_youtube_video_early_performance_snapshots" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "elapsedHours" INTEGER NOT NULL,
  "granularity" TEXT NOT NULL,
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
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_youtube_video_early_performance_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_youtube_video_early_performance_snapshots_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "admin_youtube_video_traffic_source_snapshots" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "periodDays" INTEGER NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "estimatedMinutesWatched" DOUBLE PRECISION,
  "engagedViews" INTEGER NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_youtube_video_traffic_source_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_youtube_video_traffic_source_snapshots_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "admin_youtube_video_early_performance_snapshots_videoId_elapsedHours_key"
  ON "admin_youtube_video_early_performance_snapshots"("videoId", "elapsedHours");

CREATE INDEX "admin_youtube_video_early_performance_snapshots_contentId_idx"
  ON "admin_youtube_video_early_performance_snapshots"("contentId");

CREATE INDEX "admin_youtube_video_early_performance_snapshots_elapsedHours_idx"
  ON "admin_youtube_video_early_performance_snapshots"("elapsedHours");

CREATE UNIQUE INDEX "admin_youtube_video_traffic_source_snapshots_videoId_periodDays_endDate_sourceType_key"
  ON "admin_youtube_video_traffic_source_snapshots"("videoId", "periodDays", "endDate", "sourceType");

CREATE INDEX "admin_youtube_video_traffic_source_snapshots_contentId_idx"
  ON "admin_youtube_video_traffic_source_snapshots"("contentId");

CREATE INDEX "admin_youtube_video_traffic_source_snapshots_periodDays_endDate_idx"
  ON "admin_youtube_video_traffic_source_snapshots"("periodDays", "endDate");
