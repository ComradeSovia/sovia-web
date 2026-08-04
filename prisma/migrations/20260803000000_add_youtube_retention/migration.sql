ALTER TABLE "admin_youtube_video_analytics_snapshots"
ADD COLUMN "subscribersLost" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "admin_youtube_video_early_performance_snapshots"
ADD COLUMN "subscribersLost" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "admin_youtube_video_early_performance_snapshots"
ADD COLUMN "impressions" INTEGER,
ADD COLUMN "impressionClickThroughRate" DOUBLE PRECISION;

CREATE TABLE "admin_youtube_video_retention_snapshots" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "elapsedHours" INTEGER NOT NULL,
    "elapsedVideoTimePercent" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "audienceWatchRatio" DOUBLE PRECISION NOT NULL,
    "relativeRetentionPerformance" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_youtube_video_retention_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_youtube_video_retention_snapshots_videoId_elapsedHours_elapsedVideoTimePercent_key"
ON "admin_youtube_video_retention_snapshots"("videoId", "elapsedHours", "elapsedVideoTimePercent");

CREATE INDEX "admin_youtube_video_retention_snapshots_contentId_elapsedHours_idx"
ON "admin_youtube_video_retention_snapshots"("contentId", "elapsedHours");

ALTER TABLE "admin_youtube_video_retention_snapshots"
ADD CONSTRAINT "admin_youtube_video_retention_snapshots_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "admin_youtube_video_reach_daily" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "impressionClickThroughRate" DOUBLE PRECISION,
    "reportId" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_youtube_video_reach_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_youtube_video_reach_daily_videoId_date_key"
ON "admin_youtube_video_reach_daily"("videoId", "date");

CREATE INDEX "admin_youtube_video_reach_daily_contentId_date_idx"
ON "admin_youtube_video_reach_daily"("contentId", "date");

ALTER TABLE "admin_youtube_video_reach_daily"
ADD CONSTRAINT "admin_youtube_video_reach_daily_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "admin_youtube_reporting_imports" (
    "reportId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "admin_youtube_reporting_imports_pkey" PRIMARY KEY ("reportId")
);

CREATE INDEX "admin_youtube_reporting_imports_jobId_createdAt_idx"
ON "admin_youtube_reporting_imports"("jobId", "createdAt");
