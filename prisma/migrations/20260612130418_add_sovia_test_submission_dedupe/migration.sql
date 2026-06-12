-- CreateTable
CREATE TABLE "sovia_test_submissions" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT,
    "fingerprint" TEXT,
    "resultCode" TEXT NOT NULL,
    "resultHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sovia_test_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sovia_test_submissions_fingerprint_key" ON "sovia_test_submissions"("fingerprint");

-- CreateIndex
CREATE INDEX "sovia_test_submissions_visitorId_idx" ON "sovia_test_submissions"("visitorId");

-- CreateIndex
CREATE INDEX "sovia_test_submissions_resultCode_idx" ON "sovia_test_submissions"("resultCode");

-- CreateIndex
CREATE INDEX "sovia_test_submissions_locale_idx" ON "sovia_test_submissions"("locale");
