CREATE TABLE "music_work_search_embeddings" (
    "contentId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_work_search_embeddings_pkey" PRIMARY KEY ("contentId")
);

ALTER TABLE "music_work_search_embeddings"
ADD CONSTRAINT "music_work_search_embeddings_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "music_works"("contentId")
ON DELETE CASCADE ON UPDATE CASCADE;
