CREATE TABLE "admin_prompts" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-5',
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_prompts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_prompts_key_key" ON "admin_prompts"("key");
CREATE UNIQUE INDEX "admin_prompts_task_variant_key" ON "admin_prompts"("task", "variant");
CREATE UNIQUE INDEX "admin_prompts_default_task_key" ON "admin_prompts"("task") WHERE "isDefault" = true;
