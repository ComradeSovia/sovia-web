ALTER TABLE "music_work_contents"
  ADD COLUMN "vocalLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "music_work_contents"
  ADD CONSTRAINT "music_work_contents_duration_positive" CHECK ("durationSeconds" IS NULL OR "durationSeconds" > 0);
