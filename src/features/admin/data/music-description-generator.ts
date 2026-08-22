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
  SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK,
  VK_COPY_PROMPT_TASK,
  YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
  YOUTUBE_LOCALIZATION_PROMPT_TASK,
} from "./admin-prompts";
import { getAdminMusicWork, listAdminMusicWorks } from "./music-admin";

const MAX_LYRICS_CONTEXT_CHARS = 8_000;
const MAX_RELATED_CANDIDATES = 60;
const MAX_RELATED_DETAILS_CONTEXT_CHARS = 800;
const MAX_GENERATION_NOTES_CHARS = 2_000;
const MAX_SOURCE_DETAILS_CONTEXT_CHARS = 2_400;
const MAX_DESCRIPTION_FIELD_CONTEXT_CHARS = 2_000;

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
const subtitleLocalizationBatchSchema = z.object({
  localizations: z.array(
    z.object({
      locale: z.string(),
      srt: z.string(),
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
export type GeneratedSubtitleLocalizationBatch = z.infer<
  typeof subtitleLocalizationBatchSchema
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
    ...getResponseOptimizationOptions({
      contentId,
      maxOutputTokens: 1_200,
      model: prompt.model,
      task: DESCRIPTION_GENERATOR_PROMPT_TASK,
    }),
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          extraInstructions: compactGenerationNotes(generationNotes),
          from: toSourceInput(work),
          lyrics: compactLyrics(work.lyrics),
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

  logAiUsage({
    contentId,
    model: prompt.model,
    response,
    task: DESCRIPTION_GENERATOR_PROMPT_TASK,
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
  const candidates = selectRelatedCandidates(work, works, existingRelated);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    ...getResponseOptimizationOptions({
      contentId,
      maxOutputTokens: 600,
      model: prompt.model,
      task: RELATED_SUGGESTION_PROMPT_TASK,
    }),
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          currentWork: toRelatedCurrentWorkInput(work),
          extraInstructions: compactGenerationNotes(generationNotes),
          existingRelatedUids: Array.from(existingRelated),
          candidates,
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

  logAiUsage({
    contentId,
    model: prompt.model,
    response,
    task: RELATED_SUGGESTION_PROMPT_TASK,
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
    ...getResponseOptimizationOptions({
      contentId,
      maxOutputTokens: 1_800,
      model: prompt.model,
      task: YOUTUBE_LOCALIZATION_PROMPT_TASK,
    }),
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          description: toDescriptionInput(work),
          existingYoutubeLocalization: work.youtubeLocalization?.[locale],
          extraInstructions: compactGenerationNotes(generationNotes),
          from: toSourceInput(work),
          language: {
            label: getLanguageLabel(locale),
            locale,
          },
          lyrics: compactLyrics(work.lyrics),
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

  logAiUsage({
    contentId,
    model: prompt.model,
    response,
    task: YOUTUBE_LOCALIZATION_PROMPT_TASK,
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
  youtubeLocalization: Partial<
    Record<
      string,
      {
        description?: string | null;
        title?: string | null;
      }
    >
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
  const sourceYoutubeLocalization = youtubeLocalization[sourceLocale];
  if (
    !sourceYoutubeLocalization?.title?.trim() ||
    !sourceYoutubeLocalization.description?.trim()
  ) {
    throw new Error(
      "Primary YouTube language needs both title and description before translating all locales.",
    );
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
    ...getResponseOptimizationOptions({
      contentId,
      maxOutputTokens: getLocalizationOutputLimit(
        sourceYoutubeLocalization.description,
        uniqueTargetLocales.length,
      ),
      model: prompt.model,
      task: YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
    }),
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          description: toDescriptionInput(work),
          extraInstructions: compactGenerationNotes(generationNotes),
          from: toSourceInput(work),
          language: {
            label: getLanguageLabel(sourceLocale),
            locale: sourceLocale,
          },
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
          sourceYoutubeLocalization,
          // Keep per-batch fields last so the shared source context remains a
          // stable prompt-cache prefix across progressive translation calls.
          requiredOutputLocales: uniqueTargetLocales,
          targetLanguages: uniqueTargetLocales.map((locale) => ({
            existingYoutubeLocalization: youtubeLocalization[locale],
            label: getLanguageLabel(locale),
            locale,
          })),
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
                  locale: { enum: uniqueTargetLocales, type: "string" },
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

  logAiUsage({
    contentId,
    model: prompt.model,
    response,
    task: YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
  });
  const parsed = parseYouTubeLocalizationBatch(response.output_text);
  const localizations = parsed.localizations.filter((item) =>
    uniqueTargetLocales.includes(item.locale),
  );
  if (!localizations.length) {
    const returnedLocales = parsed.localizations
      .map((item) => item.locale)
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `The model returned no translations for the requested YouTube locales. Requested: ${uniqueTargetLocales.join(", ")}. Returned: ${returnedLocales || "none"}.`,
    );
  }

  return {
    localizations,
  };
}

export async function generateSubtitleLocalizationBatch({
  contentId,
  generationNotes,
  promptKey,
  sourceLocale,
  subtitleTracks,
  targetLocales,
}: {
  contentId: string;
  generationNotes?: string | null;
  promptKey?: string | null;
  sourceLocale: string;
  subtitleTracks: Record<string, string | null | undefined>;
  targetLocales: string[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const [prompt, work] = await Promise.all([
    promptKey
      ? getEnabledAdminPromptByKey(
          promptKey,
          SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK,
        )
      : getDefaultAdminPromptForTask(SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK),
    getAdminMusicWork(contentId),
  ]);

  if (!prompt) {
    throw new Error(
      promptKey
        ? "Selected prompt is disabled, missing, or belongs to a different task."
        : `Create an enabled prompt for task "${SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK}" first.`,
    );
  }
  if (!work) {
    throw new Error("Content record could not be loaded.");
  }
  if (!sourceLocale) {
    throw new Error("Select a primary subtitle language first.");
  }
  const sourceSrt = subtitleTracks[sourceLocale]?.trim();
  if (!sourceSrt) {
    throw new Error(
      "Primary subtitle language needs SRT content before translating all subtitle locales.",
    );
  }
  const uniqueTargetLocales = Array.from(
    new Set(
      targetLocales.filter((locale) => locale && locale !== sourceLocale),
    ),
  );
  if (!uniqueTargetLocales.length) {
    throw new Error("No target subtitle languages are available.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    ...getResponseOptimizationOptions({
      contentId,
      maxOutputTokens: getSubtitleOutputLimit(
        sourceSrt,
        uniqueTargetLocales.length,
      ),
      model: prompt.model,
      task: SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK,
    }),
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        // Field order matters for OpenAI prompt caching: everything that stays
        // identical across per-batch requests for the same content (prompt,
        // metadata, and the large `sourceSrt`) is emitted first so it forms a
        // stable, cacheable prefix. The only fields that vary per request
        // (`requiredOutputLocales`, `targetLanguages`) come last so they never
        // invalidate the cached prefix.
        content: JSON.stringify({
          contentId: work.contentId,
          description: toDescriptionInput(work),
          extraInstructions: compactGenerationNotes(generationNotes),
          from: toSourceInput(work),
          metadata: {
            contentId: work.contentId,
            path: work.path,
            publishedAt: work.publishedAt,
            songTitle: work.songTitle ?? work.title,
            title: work.title,
            workType: work.workType,
            youtubeId: work.u2bId,
          },
          sourceLanguage: {
            label: getLanguageLabel(sourceLocale),
            locale: sourceLocale,
          },
          sourceSrt,
          // --- per-request varying fields below (keep last for caching) ---
          requiredOutputLocales: uniqueTargetLocales,
          targetLanguages: uniqueTargetLocales.map((locale) => ({
            existingSrt: subtitleTracks[locale],
            label: getLanguageLabel(locale),
            locale,
          })),
        }),
        role: "user",
      },
    ],
    model: prompt.model,
    text: {
      format: {
        name: "music_subtitle_localization_batch",
        schema: {
          additionalProperties: false,
          properties: {
            localizations: {
              items: {
                additionalProperties: false,
                properties: {
                  locale: { enum: uniqueTargetLocales, type: "string" },
                  srt: { type: "string" },
                },
                required: ["locale", "srt"],
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

  logAiUsage({
    contentId,
    model: prompt.model,
    response,
    task: SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK,
  });
  const parsed = parseSubtitleLocalizationBatch(response.output_text);
  const invalidTimelineMessages: string[] = [];
  const localizations = parsed.localizations.flatMap((item) => {
    if (!uniqueTargetLocales.includes(item.locale) || !item.srt.trim()) {
      return [];
    }

    try {
      return [
        {
          ...item,
          srt: restoreSourceSrtTimeline(sourceSrt, item.srt),
        },
      ];
    } catch (error) {
      invalidTimelineMessages.push(
        `${item.locale}: ${
          error instanceof Error ? error.message : "invalid SRT structure"
        }`,
      );
      return [];
    }
  });
  if (!localizations.length) {
    const returnedLocales = parsed.localizations
      .map((item) => item.locale)
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `The model returned no valid subtitles for the requested locales. Requested: ${uniqueTargetLocales.join(", ")}. Returned: ${returnedLocales || "none"}.${
        invalidTimelineMessages.length
          ? ` Timeline validation failed: ${invalidTimelineMessages.join("; ")}.`
          : ""
      }`,
    );
  }

  return { localizations };
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
  if (!work.u2bId) {
    throw new Error("YouTube ID is required before generating platform copy.");
  }
  const platformId = work[platform.idField];

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
    ...getResponseOptimizationOptions({
      contentId,
      maxOutputTokens: platform.name === "pixiv" ? 1_600 : 1_200,
      model: prompt.model,
      task: platform.promptTask,
    }),
    input: [
      {
        content: prompt.content,
        role: "developer",
      },
      {
        content: JSON.stringify({
          contentId: work.contentId,
          description: toDescriptionInput(work),
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
          extraInstructions: compactGenerationNotes(generationNotes),
          from: toSourceInput(work),
          lyrics: compactLyrics(work.lyrics),
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

  logAiUsage({
    contentId,
    model: prompt.model,
    response,
    task: platform.promptTask,
  });
  return parsePlatformCopy(response.output_text);
}

function getResponseOptimizationOptions({
  contentId,
  maxOutputTokens,
  model,
  task,
}: {
  contentId: string;
  maxOutputTokens: number;
  model: string;
  task: string;
}) {
  const supportsReasoningEffort = model.startsWith("gpt-5");

  return {
    max_output_tokens: maxOutputTokens,
    prompt_cache_key: getPromptCacheKey(task, contentId),
    ...(supportsReasoningEffort
      ? { reasoning: { effort: "low" as const } }
      : {}),
  };
}

function getPromptCacheKey(task: string, contentId: string) {
  return `sovia:${task.slice(0, 16)}:${contentId}`;
}

function getLocalizationOutputLimit(
  sourceDescription: string,
  targetLocaleCount: number,
) {
  // A near-limit YouTube description translated into CJK can approach one
  // output token per character. Size the budget from the actual source text so
  // a one-locale safety batch is not still truncated by the old 2k minimum.
  const estimatedOutputTokens =
    sourceDescription.length * targetLocaleCount + 800;

  return Math.min(20_000, Math.max(2_000, estimatedOutputTokens));
}

function getSubtitleOutputLimit(sourceSrt: string, targetLocaleCount: number) {
  // SRT translations into CJK languages can approach one token per character.
  // Reserve enough space for every requested target instead of estimating from
  // English-like token density, which truncates long Suno lyric subtitles.
  const estimatedOutputTokens = sourceSrt.length * targetLocaleCount + 500;

  return Math.min(20_000, Math.max(4_000, estimatedOutputTokens));
}

function compactLyrics(value: string | null | undefined) {
  return compactText(
    value,
    MAX_LYRICS_CONTEXT_CHARS,
    "lyrics omitted for context size",
  );
}

function compactGenerationNotes(value: string | null | undefined) {
  return compactText(
    value,
    MAX_GENERATION_NOTES_CHARS,
    "additional instructions omitted for context size",
  );
}

function compactText(
  value: string | null | undefined,
  maxLength: number,
  omissionLabel: string,
) {
  if (!value || value.length <= maxLength) return value;

  const headLength = Math.floor(maxLength * 0.75);
  const tailLength = maxLength - headLength;

  return `${value.slice(0, headLength)}\n\n[... ${omissionLabel} ...]\n\n${value.slice(-tailLength)}`;
}

function toDescriptionInput(
  work: NonNullable<Awaited<ReturnType<typeof getAdminMusicWork>>>,
) {
  return {
    introText: compactText(
      work.introText,
      MAX_DESCRIPTION_FIELD_CONTEXT_CHARS,
      "description context omitted for size",
    ),
    productionNotes: compactText(
      work.productionNotes,
      MAX_DESCRIPTION_FIELD_CONTEXT_CHARS,
      "description context omitted for size",
    ),
    shortDescription: compactText(
      work.shortDescription,
      MAX_DESCRIPTION_FIELD_CONTEXT_CHARS,
      "description context omitted for size",
    ),
  };
}

function toSourceInput(
  work: NonNullable<Awaited<ReturnType<typeof getAdminMusicWork>>>,
) {
  return {
    artists: work.fromArtists,
    details: compactText(
      work.fromDetails,
      MAX_SOURCE_DETAILS_CONTEXT_CHARS,
      "source details omitted for context size",
    ),
    ip: work.fromIp,
    series: work.fromSeries,
    session: work.fromSession,
    sourceUrl: work.fromSource,
    title: work.fromTitle,
    type: work.fromType,
  };
}

function selectRelatedCandidates(
  work: NonNullable<Awaited<ReturnType<typeof getAdminMusicWork>>>,
  works: Awaited<ReturnType<typeof listAdminMusicWorks>>,
  existingRelated: Set<string>,
) {
  return works
    .filter(
      (candidate) =>
        candidate.contentId !== work.contentId &&
        !existingRelated.has(candidate.contentId),
    )
    .map((candidate, index) => ({
      candidate,
      index,
      score: getRelatedCandidateScore(work, candidate),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, MAX_RELATED_CANDIDATES)
    .map(({ candidate }) => toRelatedCandidateInput(candidate));
}

function getRelatedCandidateScore(
  work: NonNullable<Awaited<ReturnType<typeof getAdminMusicWork>>>,
  candidate: Awaited<ReturnType<typeof listAdminMusicWorks>>[number],
) {
  return (
    (sameString(work.fromIp, candidate.fromIp) ? 8 : 0) +
    (sameString(work.fromSeries, candidate.fromSeries) ? 5 : 0) +
    (work.workType === candidate.workType ? 3 : 0) +
    (sameString(work.fromType, candidate.fromType) ? 2 : 0) +
    (sameStringList(work.fromArtists, candidate.fromArtists) ? 2 : 0)
  );
}

function sameString(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return Boolean(left && right && left === right);
}

function sameStringList(
  left: string[] | null | undefined,
  right: string[] | null | undefined,
) {
  return Boolean(
    left?.length &&
      right?.length &&
      left.length === right.length &&
      left.every((value, index) => value === right[index]),
  );
}

function logAiUsage({
  contentId,
  model,
  response,
  task,
}: {
  contentId: string;
  model: string;
  response: {
    usage?: {
      input_tokens: number;
      input_tokens_details?: { cached_tokens: number };
      output_tokens: number;
      output_tokens_details?: { reasoning_tokens: number };
    } | null;
  };
  task: string;
}) {
  const usage = response.usage;
  if (!usage) return;

  console.info("OpenAI response usage", {
    cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? 0,
    contentId,
    inputTokens: usage.input_tokens,
    model,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
    task,
  });
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
    details: compactText(
      work.fromDetails,
      MAX_RELATED_DETAILS_CONTEXT_CHARS,
      "candidate details omitted for context size",
    ),
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

function parseSubtitleLocalizationBatch(outputText: string) {
  try {
    return normalizeSubtitleLocalizationBatch(JSON.parse(outputText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The model response was not valid JSON.");
    }
    throw error;
  }
}

type SrtTimelineCue = {
  index: string;
  timing: string;
};

function restoreSourceSrtTimeline(sourceSrt: string, translatedSrt: string) {
  const sourceCues = parseSourceSrtTimeline(sourceSrt);
  const translatedTextBlocks = parseTranslatedSrtTextBlocks(translatedSrt);

  if (translatedTextBlocks.length !== sourceCues.length) {
    throw new Error(
      `expected ${sourceCues.length} cues but received ${translatedTextBlocks.length}`,
    );
  }

  return sourceCues
    .map(
      (cue, index) =>
        `${cue.index}\n${cue.timing}\n${translatedTextBlocks[index]}`,
    )
    .join("\n\n");
}

function parseSourceSrtTimeline(value: string): SrtTimelineCue[] {
  const blocks = getSrtBlocks(value);
  const timingPattern =
    /^\d{2,3}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2,3}:\d{2}:\d{2},\d{3}(?:\s+.*)?$/;

  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n");
    const index = lines[0]?.trim() ?? "";
    const timing = lines[1]?.trim() ?? "";
    if (!/^\d+$/.test(index) || !timingPattern.test(timing)) {
      throw new Error(`source cue ${blockIndex + 1} is not valid SRT`);
    }
    return { index, timing };
  });
}

function parseTranslatedSrtTextBlocks(value: string) {
  return getSrtBlocks(value).map((block, blockIndex) => {
    const lines = block.split("\n");
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    const textStart = timingIndex >= 0 ? timingIndex + 1 : 2;
    const text = lines.slice(textStart).join("\n").trim();
    if (!text) {
      throw new Error(`translated cue ${blockIndex + 1} has no text`);
    }
    return text;
  });
}

function getSrtBlocks(value: string) {
  const normalized = value
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:srt)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!normalized) throw new Error("SRT is empty");
  return normalized.split(/\n\s*\n(?=\s*\d+\s*\n)/);
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

function normalizeSubtitleLocalizationBatch(value: unknown) {
  const result = subtitleLocalizationBatchSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      "The model response did not include subtitle localizations.",
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
