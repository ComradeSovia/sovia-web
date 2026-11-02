CREATE TABLE "security_states" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_states_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "security_states_expiresAt_idx" ON "security_states"("expiresAt");
