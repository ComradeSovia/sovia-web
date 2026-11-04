-- CreateEnum
CREATE TYPE "SongRequestStatus" AS ENUM ('PENDING', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MusicPlanWorkMatch" AS ENUM ('FULL', 'PARTIAL', 'RELATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminMusicTodoStatus" ADD VALUE 'IN_PRODUCTION';
ALTER TYPE "AdminMusicTodoStatus" ADD VALUE 'PAUSED';
ALTER TYPE "AdminMusicTodoStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "admin_youtube_locales_position_idx";

-- AlterTable
ALTER TABLE "admin_youtube_video_analytics_snapshots" ALTER COLUMN "estimatedMinutesWatched" DROP NOT NULL,
ALTER COLUMN "estimatedMinutesWatched" DROP DEFAULT,
ALTER COLUMN "averageViewDuration" DROP NOT NULL,
ALTER COLUMN "averageViewDuration" DROP DEFAULT;

-- CreateTable
CREATE TABLE "song_requests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "origin" TEXT,
    "sourceUrl" TEXT,
    "ideas" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WEBSITE',
    "legacyTodoId" TEXT,
    "status" "SongRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_request_plans" (
    "requestId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_request_plans_pkey" PRIMARY KEY ("requestId","planId")
);

-- CreateTable
CREATE TABLE "music_plan_works" (
    "planId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "match" "MusicPlanWorkMatch" NOT NULL DEFAULT 'FULL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_plan_works_pkey" PRIMARY KEY ("planId","contentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "song_requests_legacyTodoId_key" ON "song_requests"("legacyTodoId");

-- CreateIndex
CREATE INDEX "song_requests_status_createdAt_idx" ON "song_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "song_request_plans_planId_idx" ON "song_request_plans"("planId");

-- CreateIndex
CREATE INDEX "music_plan_works_contentId_idx" ON "music_plan_works"("contentId");

-- AddForeignKey
ALTER TABLE "song_request_plans" ADD CONSTRAINT "song_request_plans_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "song_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_request_plans" ADD CONSTRAINT "song_request_plans_planId_fkey" FOREIGN KEY ("planId") REFERENCES "admin_music_todos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_plan_works" ADD CONSTRAINT "music_plan_works_planId_fkey" FOREIGN KEY ("planId") REFERENCES "admin_music_todos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_plan_works" ADD CONSTRAINT "music_plan_works_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every legacy Work link without changing existing Todo IDs or state.
INSERT INTO "music_plan_works" ("planId", "contentId", "match", "createdAt", "updatedAt")
SELECT "id", "contentId", 'FULL', "createdAt", "updatedAt"
FROM "admin_music_todos" WHERE "contentId" IS NOT NULL;

-- Only the old contact action used this exact channel marker. Other historic
-- Todos remain plans with unknown provenance; do not invent audience requests.
INSERT INTO "song_requests" ("id", "title", "artist", "sourceUrl", "ideas", "channel", "legacyTodoId", "status", "createdAt", "updatedAt")
SELECT 'legacy-request-' || "id", "title", "sourceArtists", "sourceUrl", "notes",
       'LEGACY_CONTACT', "id",
       CASE WHEN "status" = 'PROPOSED' AND NOT "visible" AND "contentId" IS NULL
            THEN 'PENDING'::"SongRequestStatus" ELSE 'ACCEPTED'::"SongRequestStatus" END,
       "createdAt", "updatedAt"
FROM "admin_music_todos" WHERE "from" = 'Contact page';

INSERT INTO "song_request_plans" ("requestId", "planId", "createdAt")
SELECT 'legacy-request-' || "id", "id", "createdAt"
FROM "admin_music_todos" WHERE "from" = 'Contact page';

