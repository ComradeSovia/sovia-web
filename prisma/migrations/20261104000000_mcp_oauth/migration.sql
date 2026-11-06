CREATE TABLE "mcp_oauth_clients" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "redirectUris" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mcp_oauth_connections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actor" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3)
);
CREATE INDEX "mcp_oauth_connections_actor_createdAt_idx" ON "mcp_oauth_connections"("actor", "createdAt");
CREATE TABLE "mcp_oauth_codes" (
  "hash" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL REFERENCES "mcp_oauth_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "challenge" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3)
);
CREATE INDEX "mcp_oauth_codes_expiresAt_idx" ON "mcp_oauth_codes"("expiresAt");
CREATE TABLE "mcp_oauth_tokens" (
  "hash" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL REFERENCES "mcp_oauth_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "mcp_oauth_tokens_connectionId_kind_idx" ON "mcp_oauth_tokens"("connectionId", "kind");
CREATE INDEX "mcp_oauth_tokens_expiresAt_idx" ON "mcp_oauth_tokens"("expiresAt");
