CREATE TABLE "youtube_thumbnail_caches" (
    "videoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceVariant" TEXT,
    "storageKey" TEXT,
    "blurDataUrl" TEXT,
    "contentType" TEXT,
    "byteSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "etag" TEXT,
    "lastModified" TEXT,
    "httpStatus" INTEGER,
    "failureReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "checkedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "availabilityStatus" TEXT NOT NULL DEFAULT 'unknown',
    "availabilityAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "availabilityCheckedAt" TIMESTAMP(3),
    "availabilityNextCheckAt" TIMESTAMP(3),
    "availabilityHttpStatus" INTEGER,
    "availabilityFailureReason" TEXT,
    "availabilityLeaseUntil" TIMESTAMP(3),
    "availabilityLeaseToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_thumbnail_caches_pkey" PRIMARY KEY ("videoId")
);

CREATE INDEX "youtube_thumbnail_caches_status_nextRetryAt_idx"
ON "youtube_thumbnail_caches"("status", "nextRetryAt");

CREATE INDEX "youtube_thumbnail_caches_availabilityStatus_availabilityNextCheckAt_idx"
ON "youtube_thumbnail_caches"("availabilityStatus", "availabilityNextCheckAt");
