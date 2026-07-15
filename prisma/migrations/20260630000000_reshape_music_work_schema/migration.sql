-- The original music_works table is known to be empty in this development
-- database, so this migration replaces the early prototype shape with the
-- normalized admin schema.
DROP TABLE IF EXISTS "music_work_subtitles" CASCADE;
DROP TABLE IF EXISTS "music_work_platforms" CASCADE;
DROP TABLE IF EXISTS "music_work_sources" CASCADE;
DROP TABLE IF EXISTS "music_work_contents" CASCADE;
DROP TABLE IF EXISTS "music_work_statuses" CASCADE;
DROP TABLE IF EXISTS "music_works" CASCADE;

CREATE TABLE "music_works" (
  "contentId" TEXT NOT NULL,
  "path" TEXT,
  "workType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "music_works_pkey" PRIMARY KEY ("contentId")
);

CREATE UNIQUE INDEX "music_works_path_key" ON "music_works"("path");

CREATE TABLE "music_work_statuses" (
  "contentId" TEXT NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TEXT,

  CONSTRAINT "music_work_statuses_pkey" PRIMARY KEY ("contentId"),
  CONSTRAINT "music_work_statuses_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "music_work_contents" (
  "contentId" TEXT NOT NULL,
  "songTitle" TEXT,
  "lyrics" TEXT,
  "shortDescription" TEXT,
  "introText" TEXT,
  "productionNotes" TEXT,
  "relatedWorkUids" TEXT,

  CONSTRAINT "music_work_contents_pkey" PRIMARY KEY ("contentId"),
  CONSTRAINT "music_work_contents_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "music_work_sources" (
  "contentId" TEXT NOT NULL,
  "sourceType" TEXT,
  "title" TEXT,
  "artists" JSONB,
  "sourceUrl" TEXT,
  "ip" TEXT,
  "series" TEXT,
  "session" TEXT,
  "details" TEXT,

  CONSTRAINT "music_work_sources_pkey" PRIMARY KEY ("contentId"),
  CONSTRAINT "music_work_sources_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "music_work_platforms" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "platformId" TEXT,
  "title" TEXT,
  "description" TEXT,
  "metadata" JSONB,

  CONSTRAINT "music_work_platforms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "music_work_platforms_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "music_work_platforms_contentId_platform_key"
ON "music_work_platforms"("contentId", "platform");

CREATE TABLE "music_work_subtitles" (
  "contentId" TEXT NOT NULL,
  "tracks" JSONB,

  CONSTRAINT "music_work_subtitles_pkey" PRIMARY KEY ("contentId"),
  CONSTRAINT "music_work_subtitles_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
    ON DELETE CASCADE ON UPDATE CASCADE
);
