import type { AdminActionDefinition, AdminActionInput } from "./types";

const CONTENT_ID_INPUT: AdminActionInput = {
  key: "contentId",
  label: "CID",
  required: true,
  type: "content",
  url: "sync",
  urlKey: "cid",
};

const NOTES_INPUT: AdminActionInput = {
  description: "Optional instructions for this run. They are not saved.",
  key: "generationNotes",
  label: "Generation notes",
  maxUrlLength: 500,
  type: "textarea",
  url: "sync",
  urlKey: "notes",
};

const PROMPT_TASK = {
  bilibili: "music.bilibili.copy.generate",
  description: "music.description.generate",
  pixiv: "music.pixiv.copy.generate",
  related: "music.related.suggest",
  subtitles: "music.subtitles.localization.batch.generate",
  vk: "music.vk.copy.generate",
  youtube: "music.youtube.localization.generate",
  youtubeBatch: "music.youtube.localization.batch.generate",
} as const;

function promptInput(promptTask: string): AdminActionInput {
  return {
    description: "Leave empty to use the enabled default prompt.",
    key: "promptKey",
    label: "Prompt",
    promptTask,
    type: "prompt",
    url: "sync",
    urlKey: "prompt",
  };
}

const standard = { type: "standard" } as const;
const preview = { mode: "preview" } as const;
const noOutput = { mode: "none" } as const;

export const ADMIN_ACTIONS = [
  {
    availability: { pageSteps: ["description"] },
    description:
      "Generate description fields for a content record and preview them before saving.",
    execution: {
      endpoint: "/admin/api/content/:contentId/generate-description",
      method: "POST",
      type: "http",
    },
    id: "content.generate-description",
    inputs: [
      CONTENT_ID_INPUT,
      promptInput(PROMPT_TASK.description),
      NOTES_INPUT,
    ],
    output: {
      ...preview,
      applyToForm: "description",
      save: { target: "description" },
    },
    presentation: standard,
    scope: "content",
    title: "Generate description",
    type: "ai",
  },
  {
    availability: { pageSteps: ["related"] },
    description:
      "Suggest related works for a content record and preview them before saving.",
    execution: {
      endpoint: "/admin/api/content/:contentId/suggest-related",
      method: "POST",
      type: "http",
    },
    closeOn: [],
    id: "content.suggest-related",
    inputs: [CONTENT_ID_INPUT, promptInput(PROMPT_TASK.related), NOTES_INPUT],
    output: { ...preview, applyToForm: "related", save: { target: "related" } },
    presentation: standard,
    scope: "content",
    title: "Suggest related",
    type: "ai",
  },
  {
    availability: { pageSteps: ["bilibili"] },
    description:
      "Generate BiliBili title and description, then preview or save the result.",
    execution: {
      endpoint: "/admin/api/content/:contentId/generate-bilibili-copy",
      method: "POST",
      type: "http",
    },
    id: "content.generate-bilibili-copy",
    inputs: [CONTENT_ID_INPUT, promptInput(PROMPT_TASK.bilibili), NOTES_INPUT],
    output: {
      ...preview,
      applyToForm: "bilibili",
      save: { target: "bilibili" },
    },
    presentation: standard,
    scope: "content",
    title: "Generate BiliBili copy",
    type: "ai",
  },
  {
    availability: { pageSteps: ["vk"] },
    description:
      "Generate VK title and description, then preview or save the result.",
    execution: {
      endpoint: "/admin/api/content/:contentId/generate-vk-copy",
      method: "POST",
      type: "http",
    },
    id: "content.generate-vk-copy",
    inputs: [CONTENT_ID_INPUT, promptInput(PROMPT_TASK.vk), NOTES_INPUT],
    output: { ...preview, applyToForm: "vk", save: { target: "vk" } },
    presentation: standard,
    scope: "content",
    title: "Generate VK copy",
    type: "ai",
  },
  {
    availability: { pageSteps: ["pixiv"] },
    description:
      "Generate Pixiv title, description, and tags, then preview or save the result.",
    execution: {
      endpoint: "/admin/api/content/:contentId/generate-pixiv-copy",
      method: "POST",
      type: "http",
    },
    id: "content.generate-pixiv-copy",
    inputs: [CONTENT_ID_INPUT, promptInput(PROMPT_TASK.pixiv), NOTES_INPUT],
    output: { ...preview, applyToForm: "pixiv", save: { target: "pixiv" } },
    presentation: standard,
    scope: "content",
    title: "Generate Pixiv copy",
    type: "ai",
  },
  {
    availability: { pageSteps: ["youtube"] },
    description:
      "Generate a primary-language YouTube title and description for the selected locale.",
    execution: {
      endpoint: "/admin/api/content/:contentId/generate-youtube-localization",
      method: "POST",
      type: "http",
    },
    id: "content.generate-youtube-copy",
    inputs: [
      CONTENT_ID_INPUT,
      {
        defaultFromFormField: "youtubePrimaryLocale",
        key: "locale",
        label: "Target locale",
        required: true,
        type: "youtubeLocale",
        url: "sync",
      },
      promptInput(PROMPT_TASK.youtube),
      NOTES_INPUT,
    ],
    output: { ...preview, applyToForm: "youtube" },
    presentation: standard,
    scope: "content",
    title: "Generate YouTube copy",
    type: "ai",
  },
  {
    availability: { pageSteps: ["youtube"] },
    description:
      "Translate the saved primary YouTube localization into every other enabled YouTube locale.",
    execution: {
      endpoint:
        "/admin/api/content/:contentId/generate-youtube-localization-batch",
      method: "POST",
      type: "http",
    },
    id: "content.translate-youtube-i18n",
    inputs: [
      CONTENT_ID_INPUT,
      {
        allowDefault: true,
        defaultOptionLabel: "Use saved primary YouTube locale",
        description:
          "Leave empty to use the content record's saved primary YouTube locale.",
        key: "sourceLocale",
        label: "Source locale",
        type: "youtubeLocale",
        url: "sync",
      },
      promptInput(PROMPT_TASK.youtubeBatch),
      NOTES_INPUT,
    ],
    output: { ...preview, applyToForm: "youtubeBatch" },
    presentation: standard,
    scope: "content",
    title: "Translate YouTube i18n",
    type: "ai",
  },
  {
    availability: { pageSteps: ["subtitles"] },
    description:
      "Translate subtitle tracks and preview or save the returned SRT localizations.",
    execution: {
      batch: {
        inputKey: "targetLocales",
        outputKey: "localizations",
        strategy: "subtitle-localizations",
      },
      endpoint:
        "/admin/api/content/:contentId/generate-subtitle-localization-batch",
      formContext: "subtitle-translation",
      method: "POST",
      type: "http",
    },
    id: "content.translate-subtitles",
    inputs: [
      CONTENT_ID_INPUT,
      {
        allowDefault: true,
        defaultFromSubtitleForm: true,
        defaultOptionLabel: "Use saved primary subtitle language",
        key: "sourceLocale",
        label: "Source locale",
        type: "subtitleLocale",
        url: "sync",
      },
      {
        excludeInputKey: "sourceLocale",
        key: "targetLocales",
        label: "Target locales",
        required: true,
        selectAllByDefault: true,
        type: "youtubeLocales",
      },
      promptInput(PROMPT_TASK.subtitles),
      NOTES_INPUT,
    ],
    output: {
      ...preview,
      applyToForm: "subtitles",
      save: { target: "subtitles" },
    },
    presentation: standard,
    scope: "content",
    title: "Translate subtitles",
    type: "ai",
  },
  {
    availability: { pageSteps: ["youtube"] },
    description:
      "Sync the saved primary YouTube metadata and selected localizations to YouTube.",
    execution: {
      endpoint: "/admin/api/content/:contentId/sync-youtube-video",
      formContext: "youtube-sync",
      method: "POST",
      type: "http",
    },
    id: "content.sync-youtube-video",
    inputs: [
      CONTENT_ID_INPUT,
      {
        description:
          "The saved primary locale supplies the default YouTube title and description.",
        key: "locales",
        label: "Localizations to sync",
        required: true,
        type: "youtubeLocales",
      },
    ],
    output: noOutput,
    presentation: standard,
    scope: "content",
    title: "Sync YouTube video",
    type: "default",
  },
  {
    availability: { pageSteps: ["subtitles"] },
    description:
      "Sync subtitle tracks to YouTube. This consumes a high YouTube API quota.",
    execution: {
      endpoint: "/admin/api/content/:contentId/sync-youtube-captions",
      formContext: "youtube-captions",
      method: "POST",
      type: "http",
    },
    id: "content.sync-youtube-captions",
    inputs: [
      CONTENT_ID_INPUT,
      {
        key: "locales",
        label: "Subtitle tracks to sync",
        required: true,
        type: "subtitleLocales",
      },
      {
        description: "Required before spending the high quota cost.",
        key: "confirmHighCost",
        label: "I confirm the quota cost",
        required: true,
        type: "checkbox",
        url: "sync",
      },
    ],
    output: noOutput,
    presentation: {
      confirmation: "This sync consumes a high YouTube API quota.",
      type: "confirm",
    },
    scope: "content",
    title: "Sync YouTube captions",
    type: "default",
  },
  {
    availability: {},
    description:
      "Fetch the latest available YouTube analytics snapshots for the connected channel.",
    execution: {
      endpoint: "/admin/analytics/sync",
      method: "POST",
      type: "form",
    },
    id: "analytics.sync-youtube",
    inputs: [],
    output: noOutput,
    presentation: standard,
    scope: "global",
    title: "Sync YouTube analytics",
    type: "default",
  },
  {
    availability: {},
    description:
      "Incrementally sync top-level audience comments channel-wide. Each page costs 1 YouTube quota unit; incremental runs stop at the previous newest comment and use at most 3 pages.",
    execution: {
      endpoint: "/admin/analytics/comments/sync",
      method: "POST",
      type: "form",
    },
    id: "analytics.sync-youtube-comments",
    inputs: [],
    output: noOutput,
    presentation: standard,
    scope: "global",
    title: "Sync YouTube comments",
    type: "default",
  },
] as const satisfies readonly AdminActionDefinition[];

export function getAdminAction(id: string) {
  return ADMIN_ACTIONS.find((action) => action.id === id) ?? null;
}

export function getAdminPageActions(step?: string | null) {
  return ADMIN_ACTIONS.filter(
    (action) =>
      action.scope === "content" &&
      hasPageStep(action.availability.pageSteps, step),
  );
}

function hasPageStep(
  pageSteps: readonly string[] | undefined,
  step?: string | null,
) {
  return pageSteps?.includes(step ?? "") ?? false;
}
