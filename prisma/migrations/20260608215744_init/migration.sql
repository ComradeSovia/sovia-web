-- CreateTable
CREATE TABLE "music_works" (
    "path" TEXT NOT NULL,
    "vid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original" TEXT,
    "u2bId" TEXT,
    "series" TEXT,
    "description" TEXT,
    "lyrics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_works_pkey" PRIMARY KEY ("path")
);
