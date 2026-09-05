CREATE TABLE "mailbox_messages" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mailbox_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mailbox_messages_createdAt_idx" ON "mailbox_messages"("createdAt");
