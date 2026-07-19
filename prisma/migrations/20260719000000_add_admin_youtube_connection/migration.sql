CREATE TABLE "admin_youtube_connections" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "channelId" TEXT NOT NULL,
    "channelTitle" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenAuthTag" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_youtube_connections_pkey" PRIMARY KEY ("id")
);
