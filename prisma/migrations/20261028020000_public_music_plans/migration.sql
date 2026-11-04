ALTER TABLE "admin_music_todos" ADD COLUMN "publicSummary" TEXT;

CREATE TABLE "music_plan_votes" (
  "planId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "music_plan_votes_pkey" PRIMARY KEY ("planId", "voterId"),
  CONSTRAINT "music_plan_votes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "admin_music_todos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "music_plan_votes_planId_active_createdAt_idx" ON "music_plan_votes"("planId", "active", "createdAt");

CREATE TABLE "music_plan_vote_limits" (
  "key" TEXT NOT NULL,
  "window" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "music_plan_vote_limits_pkey" PRIMARY KEY ("key", "window")
);
CREATE INDEX "music_plan_vote_limits_window_idx" ON "music_plan_vote_limits"("window");
