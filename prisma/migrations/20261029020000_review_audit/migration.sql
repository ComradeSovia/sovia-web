CREATE TABLE "review_audit_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "relatedType" TEXT,
  "relatedId" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "title" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "undo" JSONB NOT NULL,
  "undoOfId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "review_audit_events_undoOfId_key" ON "review_audit_events"("undoOfId");
CREATE INDEX "review_audit_events_entityType_entityId_createdAt_idx" ON "review_audit_events"("entityType", "entityId", "createdAt");
CREATE INDEX "review_audit_events_relatedType_relatedId_createdAt_idx" ON "review_audit_events"("relatedType", "relatedId", "createdAt");
CREATE INDEX "review_audit_events_sourceType_sourceId_createdAt_idx" ON "review_audit_events"("sourceType", "sourceId", "createdAt");
CREATE INDEX "review_audit_events_createdAt_idx" ON "review_audit_events"("createdAt");
