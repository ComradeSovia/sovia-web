import {
  SITE_LOCALE_LABELS,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import OpenAI from "openai";
import { z } from "zod";
import {
  BILIBILI_COPY_PROMPT_TASK,
  DESCRIPTION_GENERATOR_PROMPT_TASK,
  getDefaultAdminPromptForTask,
  getEnabledAdminPromptByKey,
  PIXIV_COPY_PROMPT_TASK,
  RELATED_SUGGESTION_PROMPT_TASK,
  VK_COPY_PROMPT_TASK,
  YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
  YOUTUBE_LOCALIZATION_PROMPT_TASK,
} from "./admin-prompts";
import { getAdminMusicWork, listAdminMusicWorks } from "./music-admin";

const generatedDescriptionSchema = z.object({
  introText: z.string(),
  productionNotes: z.string(),
  shortDescription: z.string(),
});
const relatedSuggestionSchema = z.object({
  candidates: z
    .array(
      z.object({
        reason: z.string(),
        uid: z.string(),
      }),
    )
    .length(3),
});
const youtubeLocalizationSchema = z.object({
  description: z.string(),
  title: z.string(),
});
const platformCopySchema = z.object({
  description: z.string(),
  tags: z.array(z.string()).optional(),
  title: z.string(),
});
const youtubeLocalizationBatchSchema = z.object({
  localizations: z.array(
    z.object({
      description: z.string(),
      locale: z.string(),
      title: z.string(),
    }),
  ),
});

export type GeneratedMusicWorkDescription = z.infer<
  typeof generatedDescriptionSchema
>;
export type GeneratedRelatedSuggestions = z.infer<
  typeof relatedSuggestionSchema
>;
export type GeneratedYouTubeLocalization = z.infer<
  typeof youtubeLocalizationSchema
>;
export type GeneratedPlatformCopy = z.infer<typeof platformCopySchema>;
export type GeneratedYouTubeLocalizationBatch = z.infer<
  typeof youtubeLocalizationBatchSchema
>;

export async function generateMusicWorkDescription({
  contentId,
  generationNotes,
  promptKey,
}: {
  contentId: string;
  generationNotes?: string | null;
  promptKey?: string | null;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const [prompt, work] = await Promise.all([
    promptKey
      ? getEnabledAdminPromptByKey(promptKey, DESCRIPTION_GENERATOR_PROMPT_TASK)
      : getDefaultAdminPromptForTask(DESCRIPTION_GENERATOR_PROMPT_TASK),
    getAdminMusicWork(contentId),
  ]);

  if (!prompt) {
    throw new Error(
      promptKey
        ? "Selected prompt is disabled, missing, or belongs to a different task."
        : `Create an enabled prompt for task "${DESCRIPTION_GENERATOR_PROMPT_TASK}" first.`,
    );
  }
  if (!work) {
    throw new Error("Content record could not be loaded.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          extraInstructions: generationNotes,
          from: {
            artists: work.fromArtists,
            details: work.fromDetails,
            ip: work.fromIp,
            series: work.fromSeries,
            session: work.fromSession,
            sourceUrl: work.fromSource,
            title: work.fromTitle,
            type: work.fromType,
          },
          lyrics: work.lyrics,
          songTitle: work.songTitle ?? work.title,
          workType: work.workType,
        }),
        role: "user",
      },
    ],
    model: prompt.model,
    text: {
      format: {
        name: "music_work_description",
        schema: {
          additionalProperties: false,
          properties: {
            introText: { type: "string" },
            productionNotes: { type: "string" },
            shortDescription: { type: "string" },
          },
          required: ["shortDescription", "introText", "productionNotes"],
          type: "object",
        },
        strict: true,
        type: "json_schema",
      },
    },
  });

  return parseGeneratedDescription(response.output_text);
}

export async function generateRelatedSuggestions({
  contentId,
  generationNotes,
  promptKey,
}: {
  contentId: string;
  generationNotes?: string | null;
  promptKey?: string | null;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const [prompt, work, works] = await Promise.all([
    promptKey
      ? getEnabledAdminPromptByKey(promptKey, RELATED_SUGGESTION_PROMPT_TASK)
      : getDefaultAdminPromptForTask(RELATED_SUGGESTION_PROMPT_TASK),
    getAdminMusicWork(contentId),
    listAdminMusicWorks(),
  ]);

  if (!prompt) {
    throw new Error(
      promptKey
        ? "Selected prompt is disabled, missing, or belongs to a different task."
        : `Create an enabled prompt for task "${RELATED_SUGGESTION_PROMPT_TASK}" first.`,
    );
  }
  if (!work) {
    throw new Error("Content record could not be loaded.");
  }

  const existingRelated = new Set(
    (work.relatedWorkUids ?? "")
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          currentWork: toRelatedCurrentWorkInput(work),
          extraInstructions: generationNotes,
          existingRelatedUids: Array.from(existingRelated),
          candidates: works
            .filter((candidate) => candidate.contentId !== work.contentId)
            .map(toRelatedCandidateInput),
        }),
        role: "user",
      },
    ],
    model: prompt.model,
    text: {
      format: {
        name: "music_related_suggestions",
        schema: {
          additionalProperties: false,
          properties: {
            candidates: {
              items: {
                additionalProperties: false,
                properties: {
                  reason: { type: "string" },
                  uid: { type: "string" },
                },
                required: ["uid", "reason"],
                type: "object",
              },
              maxItems: 3,
              minItems: 3,
              type: "array",
            },
          },
          required: ["candidates"],
          type: "object",
        },
        strict: true,
        type: "json_schema",
      },
    },
  });

  return parseRelatedSuggestions(response.output_text);
}

export async function generateYouTubeLocalization({
  contentId,
  generationNotes,
  locale,
  promptKey,
}: {
  contentId: string;
  generationNotes?: string | null;
  locale: string;
  promptKey?: string | null;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const [prompt, work, works] = await Promise.all([
    promptKey
      ? getEnabledAdminPromptByKey(promptKey, YOUTUBE_LOCALIZATION_PROMPT_TASK)
      : getDefaultAdminPromptForTask(YOUTUBE_LOCALIZATION_PROMPT_TASK),
    getAdminMusicWork(contentId),
    listAdminMusicWorks(),
  ]);

  if (!prompt) {
    throw new Error(
      promptKey
        ? "Selected prompt is disabled, missing, or belongs to a different task."
        : `Create an enabled prompt for task "${YOUTUBE_LOCALIZATION_PROMPT_TASK}" first.`,
    );
  }
  if (!work) {
    throw new Error("Content record could not be loaded.");
  }
  if (!work.u2bId) {
    throw new Error("YouTube ID is required before generating YouTube copy.");
  }
  const relatedUidSet = new Set(parseRelatedWorkUids(work.relatedWorkUids));
  const relatedWorks = works
    .filter((candidate) => relatedUidSet.has(candidate.contentId))
    .map(toRelatedCandidateInput);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          description: {
            introText: work.introText,
            productionNotes: work.productionNotes,
            shortDescription: work.shortDescription,
          },
          existingYoutubeLocalization: work.youtubeLocalization?.[locale],
          extraInstructions: generationNotes,
          from: {
            artists: work.fromArtists,
            details: work.fromDetails,
            ip: work.fromIp,
            series: work.fromSeries,
            session: work.fromSession,
            sourceUrl: work.fromSource,
            title: work.fromTitle,
            type: work.fromType,
          },
          language: {
            label: getLanguageLabel(locale),
            locale,
          },
          lyrics: work.lyrics,
          metadata: {
            contentId: work.contentId,
            path: work.path,
            publishedAt: work.publishedAt,
            songTitle: work.songTitle ?? work.title,
            title: work.title,
            workType: work.workType,
            youtubeId: work.u2bId,
          },
          relatedWorks,
        }),
        role: "user",
      },
    ],
    model: prompt.model,
    text: {
      format: {
        name: "music_youtube_localization",
        schema: {
          additionalProperties: false,
          properties: {
            description: { type: "string" },
            title: { type: "string" },
          },
          required: ["title", "description"],
          type: "object",
        },
        strict: true,
        type: "json_schema",
      },
    },
  });

  return parseYouTubeLocalization(response.output_text);
}

export async function generateYouTubeLocalizationBatch({
  contentId,
  generationNotes,
  promptKey,
  sourceLocale,
  targetLocales,
  youtubeLocalization,
}: {
  contentId: string;
  generationNotes?: string | null;
  promptKey?: string | null;
  sourceLocale: string;
  targetLocales: string[];
  youtubeLocalization: Record<
    string,
    {
      description?: string | null;
      title?: string | null;
    }
  >;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const [prompt, work, works] = await Promise.all([
    promptKey
      ? getEnabledAdminPromptByKey(
          promptKey,
          YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
        )
      : getDefaultAdminPromptForTask(YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK),
    getAdminMusicWork(contentId),
    listAdminMusicWorks(),
  ]);

  if (!prompt) {
    throw new Error(
      promptKey
        ? "Selected prompt is disabled, missing, or belongs to a different task."
        : `Create an enabled prompt for task "${YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK}" first.`,
    );
  }
  if (!work) {
    throw new Error("Content record could not be loaded.");
  }
  if (!work.u2bId) {
    throw new Error("YouTube ID is required before generating YouTube copy.");
  }
  if (!sourceLocale) {
    throw new Error("Select a primary YouTube language first.");
  }
  const uniqueTargetLocales = Array.from(
    new Set(
      targetLocales.filter((locale) => locale && locale !== sourceLocale),
    ),
  );
  if (!uniqueTargetLocales.length) {
    throw new Error("No target YouTube languages are available.");
  }

  const relatedUidSet = new Set(parseRelatedWorkUids(work.relatedWorkUids));
  const relatedWorks = works
    .filter((candidate) => relatedUidSet.has(candidate.contentId))
    .map(toRelatedCandidateInput);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          description: {
            introText: work.introText,
            productionNotes: work.productionNotes,
            shortDescription: work.shortDescription,
          },
          extraInstructions: generationNotes,
          from: {
            artists: work.fromArtists,
            details: work.fromDetails,
            ip: work.fromIp,
            series: work.fromSeries,
            session: work.fromSession,
            sourceUrl: work.fromSource,
            title: work.fromTitle,
            type: work.fromType,
          },
          language: {
            label: getLanguageLabel(sourceLocale),
            locale: sourceLocale,
          },
          lyrics: work.lyrics,
          metadata: {
            contentId: work.contentId,
            path: work.path,
            publishedAt: work.publishedAt,
            songTitle: work.songTitle ?? work.title,
            title: work.title,
            workType: work.workType,
            youtubeId: work.u2bId,
          },
          relatedWorks,
          sourceYoutubeLocalization: youtubeLocalization[sourceLocale],
          targetLanguages: uniqueTargetLocales.map((locale) => ({
            existingYoutubeLocalization: youtubeLocalization[locale],
            label: getLanguageLabel(locale),
            locale,
          })),
          youtubeLocalization,
        }),
        role: "user",
      },
    ],
    model: prompt.model,
    text: {
      format: {
        name: "music_youtube_localization_batch",
        schema: {
          additionalProperties: false,
          properties: {
            localizations: {
              items: {
                additionalProperties: false,
                properties: {
                  description: { type: "string" },
                  locale: { type: "string" },
                  title: { type: "string" },
                },
                required: ["locale", "title", "description"],
                type: "object",
              },
              type: "array",
            },
          },
          required: ["localizations"],
          type: "object",
        },
        strict: true,
        type: "json_schema",
      },
    },
  });

  const parsed = parseYouTubeLocalizationBatch(response.output_text);
  return {
    localizations: parsed.localizations.filter((item) =>
      uniqueTargetLocales.includes(item.locale),
    ),
  };
}

export async function generateBilibiliCopy({
  contentId,
  generationNotes,
  promptKey,
}: {
  contentId: string;
  generationNotes?: string | null;
  promptKey?: string | null;
}) {
  return generatePlatformCopy({
    contentId,
    generationNotes,
    platform: {
      idField: "bilibiliId",
      idLabel: "BiliBili ID",
      name: "bilibili",
      promptTask: BILIBILI_COPY_PROMPT_TASK,
      referenceLocales: ["zh", "zh-CN", "zh-Hans"],
      targetLanguage: { label: "Chinese", locale: "zh" },
    },
    promptKey,
  });
}

export async function generateVkCopy({
  contentId,
  generationNotes,
  promptKey,
}: {
  contentId: string;
  generationNotes?: string | null;
  promptKey?: string | null;
}) {
  return generatePlatformCopy({
    contentId,
    generationNotes,
    platform: {
      idField: "vkId",
      idLabel: "VK ID",
      name: "vk",
      promptTask: VK_COPY_PROMPT_TASK,
      referenceLocales: ["ru", "ru-RU"],
      targetLanguage: { label: "Russian", locale: "ru" },
    },
    promptKey,
  });
}

export async function generatePixivCopy({
  contentId,
  generationNotes,
  promptKey,
}: {
  contentId: string;
  generationNotes?: string | null;
  promptKey?: string | null;
}) {
  return generatePlatformCopy({
    contentId,
    generationNotes,
    platform: {
      idField: "pixivId",
      idLabel: "Pixiv post ID",
      name: "pixiv",
      promptTask: PIXIV_COPY_PROMPT_TASK,
      referenceLocales: ["en", "en-US"],
      targetLanguage: { label: "English", locale: "en" },
    },
    promptKey,
  });
}

async function generatePlatformCopy({
  contentId,
  generationNotes,
  platform,
  promptKey,
}: {
  contentId: string;
  generationNotes?: string | null;
  platform: {
    idField: "bilibiliId" | "pixivId" | "vkId";
    idLabel: string;
    name: "bilibili" | "pixiv" | "vk";
    promptTask: string;
    referenceLocales: string[];
    targetLanguage: { label: string; locale: string };
  };
  promptKey?: string | null;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const [prompt, work, works] = await Promise.all([
    promptKey
      ? getEnabledAdminPromptByKey(promptKey, platform.promptTask)
      : getDefaultAdminPromptForTask(platform.promptTask),
    getAdminMusicWork(contentId),
    listAdminMusicWorks(),
  ]);

  if (!prompt) {
    throw new Error(
      promptKey
        ? "Selected prompt is disabled, missing, or belongs to a different task."
        : `Create an enabled prompt for task "${platform.promptTask}" first.`,
    );
  }
  if (!work) {
    throw new Error("Content record could not be loaded.");
  }
  const platformId = work[platform.idField];
  if (!platformId) {
    throw new Error(`${platform.idLabel} is required before generating copy.`);
  }

  const relatedUidSet = new Set(parseRelatedWorkUids(work.relatedWorkUids));
  const relatedWorks = works
    .filter((candidate) => relatedUidSet.has(candidate.contentId))
    .map(toRelatedCandidateInput);
  const outputProperties =
    platform.name === "pixiv"
      ? {
          description: { type: "string" },
          tags: {
            items: { type: "string" },
            type: "array",
          },
          title: { type: "string" },
        }
      : {
          description: { type: "string" },
          title: { type: "string" },
        };
  const outputRequired =
    platform.name === "pixiv"
      ? ["title", "description", "tags"]
      : ["title", "description"];

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          description: {
            introText: work.introText,
            productionNotes: work.productionNotes,
            shortDescription: work.shortDescription,
          },
          existingPlatformCopy:
            platform.name === "bilibili"
              ? {
                  description: work.bilibiliDescription,
                  title: work.bilibiliTitle,
                }
              : platform.name === "pixiv"
                ? {
                    description: work.pixivDescription,
                    tags: work.pixivTags,
                    title: work.pixivTitle,
                  }
                : {
                    description: work.vkDescription,
                    title: work.vkTitle,
                  },
          extraInstructions: generationNotes,
          from: {
            artists: work.fromArtists,
            details: work.fromDetails,
            ip: work.fromIp,
            series: work.fromSeries,
            session: work.fromSession,
            sourceUrl: work.fromSource,
            title: work.fromTitle,
            type: work.fromType,
          },
          lyrics: work.lyrics,
          metadata: {
            contentId: work.contentId,
            path: work.path,
            publishedAt: work.publishedAt,
            songTitle: work.songTitle ?? work.title,
            title: work.title,
            workType: work.workType,
            youtubeId: work.u2bId,
          },
          platform: {
            id: platformId,
            name: platform.name,
          },
          referenceYoutubeLocalization: getFirstYoutubeLocalization(
            work.youtubeLocalization,
            platform.referenceLocales,
          ),
          relatedWorks,
          targetLanguage: platform.targetLanguage,
        }),
        role: "user",
      },
    ],
    model: prompt.model,
    text: {
      format: {
        name: `music_${platform.name}_copy`,
        schema: {
          additionalProperties: false,
          properties: outputProperties,
          required: outputRequired,
          type: "object",
        },
        strict: true,
        type: "json_schema",
      },
    },
  });

  return parsePlatformCopy(response.output_text);
}

function getLanguageLabel(locale: string) {
  return SITE_LOCALE_LABELS[locale as SiteLocale] ?? locale;
}

function getFirstYoutubeLocalization(
  localization:
    | Partial<
        Record<string, { description?: string | null; title?: string | null }>
      >
    | null
    | undefined,
  locales: string[],
) {
  for (const locale of locales) {
    const content = localization?.[locale];
    if (content?.title || content?.description) {
      return {
        description: content.description,
        locale,
        title: content.title,
      };
    }
  }

  return null;
}

function toRelatedCurrentWorkInput(
  work: Awaited<ReturnType<typeof getAdminMusicWork>>,
) {
  if (!work) return null;

  return {
    ...toRelatedCandidateInput(work),
    lyrics: work.lyrics?.slice(0, 3000),
  };
}

function parseRelatedWorkUids(value: string | null | undefined) {
  return (value ?? "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toRelatedCandidateInput(
  work: NonNullable<Awaited<ReturnType<typeof getAdminMusicWork>>>,
) {
  return {
    contentId: work.contentId,
    details: work.fromDetails,
    distributionIds: toDistributionIdsInput(work),
    fromTitle: work.fromTitle,
    ip: work.fromIp,
    publishedAt: work.publishedAt,
    series: work.fromSeries,
    songTitle: work.songTitle ?? work.title,
    type: work.fromType,
    workType: work.workType,
  };
}

function toDistributionIdsInput(
  work: NonNullable<Awaited<ReturnType<typeof getAdminMusicWork>>>,
) {
  return {
    bilibili: work.bilibiliId,
    pixiv: work.pixivId,
    vk: work.vkId,
    youtube: work.u2bId,
  };
}

function parseGeneratedDescription(outputText: string) {
  try {
    return normalizeGeneratedDescription(JSON.parse(outputText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The model response was not valid JSON.");
    }
    throw error;
  }
}

function parseRelatedSuggestions(outputText: string) {
  try {
    return normalizeRelatedSuggestions(JSON.parse(outputText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The model response was not valid JSON.");
    }
    throw error;
  }
}

function parseYouTubeLocalization(outputText: string) {
  try {
    return normalizeYouTubeLocalization(JSON.parse(outputText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The model response was not valid JSON.");
    }
    throw error;
  }
}

function parseYouTubeLocalizationBatch(outputText: string) {
  try {
    return normalizeYouTubeLocalizationBatch(JSON.parse(outputText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The model response was not valid JSON.");
    }
    throw error;
  }
}

function parsePlatformCopy(outputText: string) {
  try {
    return normalizePlatformCopy(JSON.parse(outputText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The model response was not valid JSON.");
    }
    throw error;
  }
}

function normalizeGeneratedDescription(value: unknown) {
  const result = generatedDescriptionSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      "The model response did not include shortDescription, introText, and productionNotes.",
    );
  }

  return result.data;
}

function normalizeRelatedSuggestions(value: unknown) {
  const result = relatedSuggestionSchema.safeParse(value);
  if (!result.success) {
    throw new Error("The model response did not include exactly 3 candidates.");
  }

  return result.data;
}

function normalizeYouTubeLocalization(value: unknown) {
  const result = youtubeLocalizationSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      "The model response did not include YouTube title and description.",
    );
  }

  return result.data;
}

function normalizeYouTubeLocalizationBatch(value: unknown) {
  const result = youtubeLocalizationBatchSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      "The model response did not include YouTube localizations.",
    );
  }

  return result.data;
}

function normalizePlatformCopy(value: unknown) {
  const result = platformCopySchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      "The model response did not include title and description.",
    );
  }

  return result.data;
}
