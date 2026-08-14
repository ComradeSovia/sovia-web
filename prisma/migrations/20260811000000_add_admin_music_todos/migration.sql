CREATE TYPE "AdminMusicTodoStatus" AS ENUM ('PROPOSED', 'PLANNING', 'COMPLETED');

CREATE TABLE "admin_music_todos" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "AdminMusicTodoStatus" NOT NULL DEFAULT 'PROPOSED',
  "from" TEXT,
  "sourceArtists" TEXT,
  "sourceUrl" TEXT,
  "notes" TEXT,
  "heatScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "voteCount" INTEGER NOT NULL DEFAULT 0,
  "lastVotedAt" TIMESTAMP(3),
  "contentId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_music_todos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_music_todos_completed_content_check"
    CHECK ("status" <> 'COMPLETED' OR "contentId" IS NOT NULL)
);

CREATE UNIQUE INDEX "admin_music_todos_contentId_key"
  ON "admin_music_todos"("contentId");

CREATE INDEX "admin_music_todos_status_heatScore_idx"
  ON "admin_music_todos"("status", "heatScore");

ALTER TABLE "admin_music_todos"
  ADD CONSTRAINT "admin_music_todos_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "admin_prompts" (
  "id",
  "key",
  "task",
  "variant",
  "title",
  "description",
  "model",
  "content",
  "enabled",
  "isDefault",
  "createdAt",
  "updatedAt"
) VALUES (
  'todo_proposal_analysis_default',
  'todo.proposal.analyze.default',
  'todo.proposal.analyze',
  'default',
  'Analysis Proposal',
  'Turn arbitrary audience feedback or notes into concrete music Todo proposals.',
  'gpt-5',
  $prompt$Analyze the supplied source text and extract concrete song-adaptation requests that belong in a production Todo list.

Create one proposal per distinct requested song or adaptation idea. Merge duplicates and closely equivalent requests.

Field meanings are strict:
- title: the name of the song the user wants adapted.
- from: the work the song comes from, such as an anime, game, film, series, or album.
- sourceArtists: the original artist, composer, performer, or author.
- sourceUrl: a reference URL from YouTube, Spotify, Apple Music, or a similar music source.
- notes: the requested adaptation concept, changes, mood, style, or creative direction.

Preserve recognizable names and URLs from the source text. Do not invent facts, artists, origins, URLs, or creative directions; use an empty string when the source does not provide a value. Keep titles concise. Return no commentary outside the required structured result.$prompt$,
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
