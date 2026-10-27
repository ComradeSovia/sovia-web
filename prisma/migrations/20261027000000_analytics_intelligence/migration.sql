CREATE TABLE "admin_youtube_channel_daily" (
  "date" TEXT NOT NULL PRIMARY KEY,
  "views" INTEGER NOT NULL,
  "estimatedMinutesWatched" DOUBLE PRECISION,
  "averageViewDuration" DOUBLE PRECISION,
  "averageViewPercentage" DOUBLE PRECISION,
  "subscribersGained" INTEGER NOT NULL,
  "subscribersLost" INTEGER NOT NULL,
  "videoCatalogKey" TEXT,
  "videoCoverageComplete" BOOLEAN NOT NULL DEFAULT false,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "admin_youtube_video_daily" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "views" INTEGER NOT NULL,
  "estimatedMinutesWatched" DOUBLE PRECISION,
  "averageViewDuration" DOUBLE PRECISION,
  "averageViewPercentage" DOUBLE PRECISION,
  "subscribersGained" INTEGER NOT NULL,
  "subscribersLost" INTEGER NOT NULL,
  "likes" INTEGER NOT NULL,
  "comments" INTEGER NOT NULL,
  "shares" INTEGER NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "admin_youtube_video_daily_videoId_date_key" ON "admin_youtube_video_daily"("videoId", "date");
CREATE INDEX "admin_youtube_video_daily_date_contentId_idx" ON "admin_youtube_video_daily"("date", "contentId");
CREATE TABLE "admin_youtube_geography_snapshots" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dimension" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "views" INTEGER NOT NULL,
  "estimatedMinutesWatched" DOUBLE PRECISION,
  "averageViewDuration" DOUBLE PRECISION,
  "averageViewPercentage" DOUBLE PRECISION,
  "subscribersGained" INTEGER,
  "subscribersLost" INTEGER,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "youtube_geo_window_location_key" ON "admin_youtube_geography_snapshots"("dimension", "location", "startDate", "endDate");
CREATE INDEX "admin_youtube_geography_snapshots_dimension_endDate_idx" ON "admin_youtube_geography_snapshots"("dimension", "endDate");

ALTER TABLE "admin_youtube_video_analytics_snapshots" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'legacy_mixed';

ALTER TABLE "admin_youtube_video_daily" ADD CONSTRAINT "admin_youtube_video_daily_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_youtube_video_realtime_snapshots" ALTER COLUMN "likes" DROP NOT NULL, ALTER COLUMN "likes" DROP DEFAULT, ALTER COLUMN "comments" DROP NOT NULL, ALTER COLUMN "comments" DROP DEFAULT;
