CREATE TABLE "mcp_review_operations" (
    "id" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requiredScope" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "preview" JSONB NOT NULL,
    "result" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    CONSTRAINT "mcp_review_operations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mcp_review_operations_principalId_createdAt_idx" ON "mcp_review_operations"("principalId", "createdAt");
CREATE INDEX "mcp_review_operations_expiresAt_idx" ON "mcp_review_operations"("expiresAt");
ALTER TABLE "review_audit_events" ADD COLUMN "operationId" TEXT;
CREATE INDEX "review_audit_events_operationId_idx" ON "review_audit_events"("operationId");
