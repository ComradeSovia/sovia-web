CREATE TABLE "admin_mcp_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "allowWrite" BOOLEAN NOT NULL DEFAULT false,
  "allowPublish" BOOLEAN NOT NULL DEFAULT false,
  "allowSync" BOOLEAN NOT NULL DEFAULT true,
  "allowOAuth" BOOLEAN NOT NULL DEFAULT true,
  "allowLegacyEnvKey" BOOLEAN NOT NULL DEFAULT true,
  "apiKeyHash" TEXT,
  "apiKeyPrefix" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_mcp_settings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "admin_mcp_settings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
CREATE TABLE "admin_mcp_write_logs" (
  "id" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_mcp_write_logs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_mcp_write_logs_actor_requestId_key" ON "admin_mcp_write_logs"("actor", "requestId");
CREATE INDEX "admin_mcp_write_logs_createdAt_idx" ON "admin_mcp_write_logs"("createdAt");
