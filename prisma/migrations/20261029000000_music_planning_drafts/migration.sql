CREATE TYPE "MusicPlanningDraftStatus" AS ENUM ('DRAFT', 'APPLIED');
CREATE TABLE "music_planning_drafts" (
  "id" TEXT PRIMARY KEY,
  "sourceHash" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceText" TEXT NOT NULL,
  "originalRequestId" TEXT,
  "requestVersion" TIMESTAMP(3),
  "proposals" JSONB NOT NULL,
  "model" TEXT,
  "promptKey" TEXT,
  "status" "MusicPlanningDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "music_planning_drafts_originalRequestId_fkey" FOREIGN KEY ("originalRequestId") REFERENCES "song_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "music_planning_drafts_sourceHash_key" ON "music_planning_drafts"("sourceHash");
CREATE INDEX "music_planning_drafts_originalRequestId_idx" ON "music_planning_drafts"("originalRequestId");
CREATE INDEX "music_planning_drafts_status_updatedAt_idx" ON "music_planning_drafts"("status", "updatedAt");
ALTER TABLE "song_requests" ADD COLUMN "sourceDraftId" TEXT, ADD COLUMN "sourceProposalKey" TEXT;
CREATE UNIQUE INDEX "song_requests_sourceDraftId_sourceProposalKey_key" ON "song_requests"("sourceDraftId", "sourceProposalKey");
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_sourceDraftId_fkey" FOREIGN KEY ("sourceDraftId") REFERENCES "music_planning_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "music_planning_draft_plans" (
  "draftId" TEXT NOT NULL,
  "proposalKey" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("draftId", "proposalKey"),
  CONSTRAINT "music_planning_draft_plans_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "music_planning_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "music_planning_draft_plans_planId_fkey" FOREIGN KEY ("planId") REFERENCES "admin_music_todos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "music_planning_draft_plans_planId_idx" ON "music_planning_draft_plans"("planId");
