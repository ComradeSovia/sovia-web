ALTER TABLE "admin_music_todos"
  ADD COLUMN IF NOT EXISTS "from" TEXT,
  DROP COLUMN IF EXISTS "workType",
  DROP COLUMN IF EXISTS "sourceTitle";

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
)
ON CONFLICT DO NOTHING;
