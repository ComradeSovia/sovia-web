CREATE TABLE "admin_youtube_video_realtime_snapshots" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_youtube_video_realtime_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_youtube_video_realtime_snapshots_contentId_observedAt_idx"
ON "admin_youtube_video_realtime_snapshots"("contentId", "observedAt");

CREATE INDEX "admin_youtube_video_realtime_snapshots_videoId_observedAt_idx"
ON "admin_youtube_video_realtime_snapshots"("videoId", "observedAt");

ALTER TABLE "admin_youtube_video_realtime_snapshots"
ADD CONSTRAINT "admin_youtube_video_realtime_snapshots_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE CASCADE ON UPDATE CASCADE;
