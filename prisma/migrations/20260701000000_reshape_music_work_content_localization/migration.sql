ALTER TABLE "music_works"
DROP COLUMN IF EXISTS "description",
DROP COLUMN IF EXISTS "localizedContent",
ADD COLUMN IF NOT EXISTS "youtubeLocalization" JSONB,
ADD COLUMN IF NOT EXISTS "subtitleTracks" JSONB;
