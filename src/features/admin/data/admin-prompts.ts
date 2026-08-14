import { getFriendlyDatabaseError } from "@sovia/sound/data/database-errors";
import { getPrismaClient } from "@sovia/sound/data/prisma";

export const DESCRIPTION_GENERATOR_PROMPT_TASK = "music.description.generate";
export const RELATED_SUGGESTION_PROMPT_TASK = "music.related.suggest";
export const YOUTUBE_LOCALIZATION_PROMPT_TASK =
  "music.youtube.localization.generate";
export const YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK =
  "music.youtube.localization.batch.generate";
export const SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK =
  "music.subtitles.localization.batch.generate";
export const BILIBILI_COPY_PROMPT_TASK = "music.bilibili.copy.generate";
export const VK_COPY_PROMPT_TASK = "music.vk.copy.generate";
export const PIXIV_COPY_PROMPT_TASK = "music.pixiv.copy.generate";
export const TODO_PROPOSAL_ANALYSIS_PROMPT_TASK = "todo.proposal.analyze";
export const DEFAULT_PROMPT_VARIANT = "default";
export const ADMIN_PROMPT_TASK_OPTIONS = [
  {
    label: "Music description generator",
    value: DESCRIPTION_GENERATOR_PROMPT_TASK,
  },
  {
    label: "Music related suggestions",
    value: RELATED_SUGGESTION_PROMPT_TASK,
  },
  {
    label: "YouTube localization generator",
    value: YOUTUBE_LOCALIZATION_PROMPT_TASK,
  },
  {
    label: "YouTube localization batch generator",
    value: YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
  },
  {
    label: "Subtitle localization batch generator",
    value: SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK,
  },
  {
    label: "BiliBili copy generator",
    value: BILIBILI_COPY_PROMPT_TASK,
  },
  {
    label: "VK copy generator",
    value: VK_COPY_PROMPT_TASK,
  },
  {
    label: "Pixiv copy generator",
    value: PIXIV_COPY_PROMPT_TASK,
  },
  {
    label: "Todo proposal analysis",
    value: TODO_PROPOSAL_ANALYSIS_PROMPT_TASK,
  },
] as const;

export type AdminPromptInput = {
  content: string;
  currentKey?: string;
  description?: string | null;
  enabled: boolean;
  isDefault: boolean;
  key: string;
  model: string;
  task: string;
  title: string;
  variant: string;
};

export async function listAdminPrompts() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  return prisma.adminPrompt.findMany({
    orderBy: [{ task: "asc" }, { isDefault: "desc" }, { enabled: "desc" }],
  });
}

export async function listEnabledAdminPromptsForTask(task: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  return prisma.adminPrompt.findMany({
    orderBy: [{ isDefault: "desc" }, { variant: "asc" }],
    where: { enabled: true, task },
  });
}

export async function getDefaultAdminPromptForTask(task: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  const defaultPrompt = await prisma.adminPrompt.findFirst({
    where: { enabled: true, isDefault: true, task },
  });
  if (defaultPrompt) return defaultPrompt;

  return prisma.adminPrompt.findFirst({
    orderBy: [{ updatedAt: "desc" }],
    where: { enabled: true, task },
  });
}

export async function getEnabledAdminPromptByKey(key: string, task: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  return prisma.adminPrompt.findFirst({
    where: { enabled: true, key, task },
  });
}

export async function getAdminPromptByKey(key: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  return prisma.adminPrompt.findUnique({
    where: { key },
  });
}

export async function upsertAdminPrompt(input: AdminPromptInput) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }
  const promptData = {
    content: input.content,
    description: input.description,
    enabled: input.enabled,
    isDefault: input.isDefault,
    key: input.key,
    model: input.model,
    task: input.task,
    title: input.title,
    variant: input.variant,
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const duplicateVariant = await tx.adminPrompt.findFirst({
        select: { key: true },
        where: {
          key: { not: input.currentKey ?? input.key },
          task: input.task,
          variant: input.variant,
        },
      });

      if (duplicateVariant) {
        throw new Error(
          `A prompt with task "${input.task}" and variant "${input.variant}" already exists.`,
        );
      }

      if (input.isDefault) {
        await tx.adminPrompt.updateMany({
          data: { isDefault: false },
          where: { task: input.task },
        });
      }

      return tx.adminPrompt.upsert({
        create: promptData,
        update: promptData,
        where: { key: input.currentKey ?? input.key },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("A prompt with")) {
      throw error;
    }

    throw new Error(getAdminPromptDatabaseError(error));
  }
}

function getAdminPromptDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Unique constraint failed")) {
    if (message.includes("task") && message.includes("variant")) {
      return "A prompt with this task and variant already exists.";
    }
    if (message.includes("key")) {
      return "A prompt with this generated key already exists. Change the task or variant.";
    }
  }

  return "Prompt could not be saved. Check the task, variant, and required fields.";
}

export async function deleteAdminPromptByKey(key: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  await prisma.adminPrompt.deleteMany({ where: { key } });
}
