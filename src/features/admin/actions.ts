"use server";

import { SITE_LOCALES } from "@sovia/shared/i18n/site-locale";
import type {
  MusicWorkDraft,
  MusicWorkSubtitleTracks,
  MusicWorkYoutubeLocalization,
  YoutubeLocalizationContent,
} from "@sovia/sound/model/music";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DEFAULT_PROMPT_VARIANT,
  deleteAdminPromptByKey,
  upsertAdminPrompt,
} from "./data/admin-prompts";
import {
  clearAdminSession,
  createPasswordAdminSession,
  requireAdminSession,
} from "./data/auth";
import {
  clearMusicWorkStep,
  deleteMusicWork,
  getAdminMusicWork,
  listAdminMusicWorks,
  saveMusicWork,
} from "./data/music-admin";
import { getYoutubeLanguageCatalogLabel } from "./data/youtube-language-catalog";
import {
  deleteAdminYoutubeLocale,
  upsertAdminYoutubeLocale,
} from "./data/youtube-locales";
import {
  assertValidFullMusicWorkForm,
  assertValidMusicWorkStepForm,
  FROM_TYPES,
  type MusicWorkStep,
  parseMusicWorkStep,
  WORK_TYPES,
} from "./validation/music-work-form";

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function redirectWithActionError(
  path: string,
  error: unknown,
  fallback: string,
): never {
  redirectWithActionMessage(
    path,
    getActionErrorMessage(error, fallback),
    "error",
  );
}

function redirectWithActionSuccess(path: string, message: string): never {
  redirectWithActionMessage(path, message, "success");
}

function redirectWithActionMessage(
  path: string,
  message: string,
  status: "error" | "success",
): never {
  const separator = path.includes("?") ? "&" : "?";
  const safeMessage =
    message.length > 1000
      ? `${message.slice(0, 1000)}... [message truncated]`
      : message;
  redirect(
    `${path}${separator}message=${encodeURIComponent(safeMessage)}&status=${status}`,
  );
}

function getEditorErrorPath(contentId?: string, step?: string) {
  const base = contentId
    ? `/admin/content/${encodeURIComponent(contentId)}`
    : "/admin/content/new";

  return step ? `${base}?step=${encodeURIComponent(step)}` : base;
}

function getPromptErrorPath() {
  return "/admin/prompts";
}

function getPromptEditorPath(key: string) {
  return `/admin/prompts/${encodeURIComponent(key)}`;
}

function getYoutubeI18nPath() {
  return "/admin/yt-i18n";
}

const YOUTUBE_LOCALIZATION_FIELDS = [
  "title",
  "description",
] as const satisfies (keyof YoutubeLocalizationContent)[];

function parseYoutubeLocalization(formData: FormData) {
  const youtubeLocalization: MusicWorkYoutubeLocalization = {};
  const renderedLocales = new Set<string>();

  for (const key of formData.keys()) {
    const match = /^youtubeLocalization\.([^.]*)\.(title|description)$/.exec(
      key,
    );
    if (match?.[1]) {
      renderedLocales.add(match[1]);
    }
  }

  for (const locale of renderedLocales) {
    const content: YoutubeLocalizationContent = {};
    for (const field of YOUTUBE_LOCALIZATION_FIELDS) {
      const value = getOptionalString(
        formData,
        `youtubeLocalization.${locale}.${field}`,
      );
      if (value) {
        content[field] = value;
      }
    }

    if (Object.keys(content).length > 0) {
      youtubeLocalization[locale] = content;
    }
  }

  return { renderedLocales, youtubeLocalization };
}

function mergeYoutubeLocalization(
  existing: MusicWorkYoutubeLocalization | null | undefined,
  parsed: ReturnType<typeof parseYoutubeLocalization>,
) {
  const merged: MusicWorkYoutubeLocalization = { ...(existing ?? {}) };

  for (const locale of parsed.renderedLocales) {
    delete merged[locale];
  }

  return {
    ...merged,
    ...parsed.youtubeLocalization,
  };
}

function parseSubtitleTracks(formData: FormData) {
  const subtitleTracks: MusicWorkSubtitleTracks = {};

  for (const locale of SITE_LOCALES) {
    const value = getOptionalString(formData, `subtitleTracks.${locale}`);
    if (value) {
      subtitleTracks[locale] = value;
    }
  }

  return subtitleTracks;
}

function parseStringTags(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return null;

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : null;
}

function getUidListString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return undefined;

  const items = value
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? Array.from(new Set(items)).join("\n") : undefined;
}

function matchOption<T extends readonly string[]>(
  value: string,
  options: T,
  fallback?: T[number],
) {
  if (options.includes(value)) {
    return value as T[number];
  }

  if (fallback) return fallback;
  throw new Error("Invalid option.");
}

function getValidationValue(formData: FormData) {
  const fromType = getOptionalString(formData, "fromType")
    ? getString(formData, "fromType")
    : undefined;

  return {
    bilibiliDescription: getString(formData, "bilibiliDescription"),
    bilibiliId: getString(formData, "bilibiliId"),
    bilibiliTitle: getString(formData, "bilibiliTitle"),
    contentId: getString(formData, "contentId") || getString(formData, "vid"),
    fromArtists: getString(formData, "fromArtists"),
    fromDetails: getString(formData, "fromDetails"),
    fromIp: getString(formData, "fromIp"),
    fromSeries: getString(formData, "fromSeries"),
    fromSession: getString(formData, "fromSession"),
    fromSource: getString(formData, "fromSource"),
    fromTitle: getString(formData, "fromTitle"),
    fromType,
    introText: getString(formData, "introText"),
    lyrics: getString(formData, "lyrics"),
    path: getString(formData, "path"),
    pixivDescription: getString(formData, "pixivDescription"),
    pixivId: getString(formData, "pixivId"),
    pixivTags: getString(formData, "pixivTags"),
    pixivTitle: getString(formData, "pixivTitle"),
    productionNotes: getString(formData, "productionNotes"),
    publishedAt: getString(formData, "publishedAt"),
    relatedWorkUids: getString(formData, "relatedWorkUids"),
    shortDescription: getString(formData, "shortDescription"),
    u2bId: getString(formData, "u2bId"),
    visible: getBoolean(formData, "visible"),
    vkDescription: getString(formData, "vkDescription"),
    vkId: getString(formData, "vkId"),
    vkTitle: getString(formData, "vkTitle"),
    workType:
      getString(formData, "workType") ||
      (getBoolean(formData, "isOriginal") ? "O" : "R"),
  };
}

function toDraft(
  work: Awaited<ReturnType<typeof listAdminMusicWorks>>[number],
) {
  return {
    path: work.path,
    contentId: work.contentId,
    workType: work.workType,
    visible: work.visible,
    publishedAt: work.publishedAt,
    songTitle: work.songTitle,
    fromTitle: work.fromTitle,
    fromArtists: work.fromArtists,
    fromSource: work.fromSource,
    fromType: work.fromType,
    fromIp: work.fromIp,
    fromSeries: work.fromSeries,
    fromSession: work.fromSession,
    fromDetails: work.fromDetails,
    vid: work.vid,
    title: work.title,
    original: work.original,
    u2bId: work.u2bId,
    series: work.series,
    bilibiliId: work.bilibiliId,
    bilibiliTitle: work.bilibiliTitle,
    bilibiliDescription: work.bilibiliDescription,
    inspiredByAuthor: work.inspiredByAuthor,
    inspiredByDetail: work.inspiredByDetail,
    inspiredByTitle: work.inspiredByTitle,
    introText: work.introText,
    isOriginal: work.isOriginal,
    lyrics: work.lyrics,
    musicStyle: work.musicStyle,
    musicType: work.musicType,
    pixivId: work.pixivId,
    pixivTitle: work.pixivTitle,
    pixivDescription: work.pixivDescription,
    pixivTags: work.pixivTags,
    productionNotes: work.productionNotes,
    relatedWorkUids: work.relatedWorkUids,
    shortDescription: work.shortDescription,
    subtitleTracks: work.subtitleTracks,
    vkId: work.vkId,
    vkTitle: work.vkTitle,
    vkDescription: work.vkDescription,
    youtubeLocalization: work.youtubeLocalization,
  } satisfies MusicWorkDraft;
}

async function getExistingDraft(contentId: string | undefined) {
  if (!contentId) return null;

  const work = await getAdminMusicWork(contentId);

  return work ? toDraft(work) : null;
}

function getDefaultDraft(formData: FormData): MusicWorkDraft {
  const path = getString(formData, "path");
  const contentId =
    getString(formData, "contentId") || getString(formData, "vid");
  const workType = matchOption(
    getString(formData, "workType") || "O",
    WORK_TYPES,
  );

  if (!contentId) {
    throw new Error("Content ID is required.");
  }

  return {
    path,
    contentId,
    workType,
    visible: false,
    songTitle: getOptionalString(formData, "songTitle"),
    vid: contentId,
    title: getOptionalString(formData, "songTitle") ?? contentId,
    introText: "",
    isOriginal: false,
    lyrics: "",
    productionNotes: "",
  };
}

async function assertUniqueContentId(
  contentId: string,
  currentContentId?: string,
) {
  const works = await listAdminMusicWorks();
  const duplicate = works.find(
    (work) =>
      work.contentId === contentId && work.contentId !== currentContentId,
  );

  if (duplicate) {
    throw new Error("Content ID must be unique.");
  }
}

function applyStepDraft(
  draft: MusicWorkDraft,
  formData: FormData,
  step: MusicWorkStep,
) {
  switch (step) {
    case "metadata":
      draft.path = getString(formData, "path");
      draft.contentId =
        getString(formData, "contentId") || getString(formData, "vid");
      draft.workType = matchOption(
        getString(formData, "workType") || "O",
        WORK_TYPES,
      );
      draft.songTitle =
        getOptionalString(formData, "songTitle") ??
        getOptionalString(formData, "title");
      draft.vid = draft.contentId;
      draft.title = draft.songTitle ?? draft.contentId;
      draft.isOriginal = draft.workType === "O" || draft.workType === "CO";
      draft.musicStyle = draft.workType;
      break;
    case "status":
      draft.visible = getBoolean(formData, "visible");
      draft.publishedAt = getOptionalString(formData, "publishedAt");
      break;
    case "from":
      draft.fromType = getOptionalString(formData, "fromType")
        ? matchOption(getString(formData, "fromType"), FROM_TYPES)
        : null;
      if (draft.fromType === "Original") {
        draft.fromTitle = null;
        draft.fromArtists = null;
        draft.fromSource = null;
        draft.fromIp = null;
        draft.fromSeries = null;
        draft.fromSession = null;
        draft.fromDetails = null;
      } else {
        draft.fromTitle =
          getOptionalString(formData, "fromTitle") ??
          getOptionalString(formData, "original") ??
          getOptionalString(formData, "inspiredByTitle");
        draft.fromArtists =
          parseStringTags(formData, "fromArtists") ??
          parseStringTags(formData, "inspiredByAuthor");
        draft.fromSource =
          getOptionalString(formData, "fromSource") ??
          getOptionalString(formData, "inspiredByDetail");
        draft.fromIp = getOptionalString(formData, "fromIp");
        draft.fromSeries =
          getOptionalString(formData, "fromSeries") ??
          getOptionalString(formData, "series");
        draft.fromSession = getOptionalString(formData, "fromSession");
        draft.fromDetails = getOptionalString(formData, "fromDetails");
      }
      draft.original = draft.fromTitle;
      draft.inspiredByTitle = draft.fromTitle;
      draft.inspiredByAuthor = draft.fromArtists?.join(", ");
      draft.inspiredByDetail = draft.fromSource;
      draft.musicType = draft.fromType;
      draft.series = draft.fromSeries;
      break;
    case "description":
      draft.shortDescription = getOptionalString(formData, "shortDescription");
      draft.introText = getString(formData, "introText");
      draft.productionNotes = getString(formData, "productionNotes");
      break;
    case "lyrics":
      draft.lyrics = getString(formData, "lyrics");
      break;
    case "related":
      draft.relatedWorkUids = getUidListString(formData, "relatedWorkUids");
      break;
    case "subtitles":
      draft.subtitleTracks = parseSubtitleTracks(formData);
      break;
    case "youtube":
      draft.u2bId = getOptionalString(formData, "u2bId");
      draft.youtubeLocalization = mergeYoutubeLocalization(
        draft.youtubeLocalization,
        parseYoutubeLocalization(formData),
      );
      break;
    case "bilibili":
      draft.bilibiliId = getOptionalString(formData, "bilibiliId");
      draft.bilibiliTitle = getOptionalString(formData, "bilibiliTitle");
      draft.bilibiliDescription = getOptionalString(
        formData,
        "bilibiliDescription",
      );
      break;
    case "vk":
      draft.vkId = getOptionalString(formData, "vkId");
      draft.vkTitle = getOptionalString(formData, "vkTitle");
      draft.vkDescription = getOptionalString(formData, "vkDescription");
      break;
    case "pixiv":
      draft.pixivId = getOptionalString(formData, "pixivId");
      draft.pixivTitle = getOptionalString(formData, "pixivTitle");
      draft.pixivDescription = getOptionalString(formData, "pixivDescription");
      draft.pixivTags = getOptionalString(formData, "pixivTags");
      break;
  }

  if (!draft.contentId) {
    throw new Error("Content ID is required.");
  }
  if (!draft.workType) {
    throw new Error("Work type is required.");
  }

  return draft;
}

export async function loginAdmin(formData: FormData) {
  const password = getString(formData, "password");
  await createPasswordAdminSession(password);
  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin");
}

export async function saveMusicWorkAction(formData: FormData) {
  await requireAdminSession();

  const currentContentId = getOptionalString(formData, "currentContentId");
  const path = getString(formData, "path");
  const contentId =
    getString(formData, "contentId") || getString(formData, "vid");
  const workType = matchOption(
    getString(formData, "workType") ||
      (getBoolean(formData, "isOriginal") ? "O" : "R"),
    WORK_TYPES,
  );
  const songTitle =
    getOptionalString(formData, "songTitle") ??
    getOptionalString(formData, "title");
  const youtubeLocalization =
    parseYoutubeLocalization(formData).youtubeLocalization;
  const subtitleTracks = parseSubtitleTracks(formData);
  const fromType = getOptionalString(formData, "fromType")
    ? matchOption(getString(formData, "fromType"), FROM_TYPES)
    : getOptionalString(formData, "musicType");
  const isOriginalFrom = fromType === "Original";
  const fromTitle = isOriginalFrom
    ? null
    : (getOptionalString(formData, "fromTitle") ??
      getOptionalString(formData, "original") ??
      getOptionalString(formData, "inspiredByTitle"));
  const fromArtists = isOriginalFrom
    ? null
    : (parseStringTags(formData, "fromArtists") ??
      parseStringTags(formData, "inspiredByAuthor"));
  const fromSource = isOriginalFrom
    ? null
    : (getOptionalString(formData, "fromSource") ??
      getOptionalString(formData, "inspiredByDetail"));
  const fromSeries = isOriginalFrom
    ? null
    : (getOptionalString(formData, "fromSeries") ??
      getOptionalString(formData, "series"));

  try {
    assertValidFullMusicWorkForm(getValidationValue(formData));
    await assertUniqueContentId(contentId, currentContentId);
    await saveMusicWork({
      currentContentId,
      work: {
        path,
        contentId,
        workType,
        visible: getBoolean(formData, "visible"),
        publishedAt: getOptionalString(formData, "publishedAt"),
        songTitle,
        fromTitle,
        fromArtists,
        fromSource,
        fromType,
        fromIp: isOriginalFrom ? null : getOptionalString(formData, "fromIp"),
        fromSeries,
        fromSession: isOriginalFrom
          ? null
          : getOptionalString(formData, "fromSession"),
        fromDetails: isOriginalFrom
          ? null
          : getOptionalString(formData, "fromDetails"),
        vid: contentId,
        title: songTitle ?? contentId,
        original: fromTitle,
        u2bId: getOptionalString(formData, "u2bId"),
        series: fromSeries,
        bilibiliId: getOptionalString(formData, "bilibiliId"),
        bilibiliTitle: getOptionalString(formData, "bilibiliTitle"),
        bilibiliDescription: getOptionalString(formData, "bilibiliDescription"),
        inspiredByAuthor: fromArtists?.join(", "),
        inspiredByDetail: fromSource,
        inspiredByTitle: fromTitle,
        introText: getString(formData, "introText"),
        isOriginal: workType === "O" || workType === "CO",
        lyrics: getString(formData, "lyrics"),
        musicStyle: workType,
        musicType: fromType,
        pixivId: getOptionalString(formData, "pixivId"),
        pixivTitle: getOptionalString(formData, "pixivTitle"),
        pixivDescription: getOptionalString(formData, "pixivDescription"),
        pixivTags: getOptionalString(formData, "pixivTags"),
        productionNotes: getString(formData, "productionNotes"),
        relatedWorkUids: getUidListString(formData, "relatedWorkUids"),
        shortDescription: getOptionalString(formData, "shortDescription"),
        subtitleTracks,
        vkId: getOptionalString(formData, "vkId"),
        vkTitle: getOptionalString(formData, "vkTitle"),
        vkDescription: getOptionalString(formData, "vkDescription"),
        youtubeLocalization,
      },
    });
  } catch (error) {
    console.error("Failed to save music work.", error);
    redirectWithActionError(
      getEditorErrorPath(currentContentId ?? contentId),
      error,
      "Database error.",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/sound");
  if (path) {
    revalidatePath(`/sound/${path}`);
  }

  redirectWithActionSuccess(
    `/admin/content/${encodeURIComponent(contentId)}`,
    "Content saved.",
  );
}

export async function saveMusicWorkStepAction(formData: FormData) {
  await requireAdminSession();

  const stepValue = getString(formData, "adminStep");
  const currentContentId = getOptionalString(formData, "currentContentId");
  let step: MusicWorkStep;
  let draft: MusicWorkDraft;

  try {
    step = parseMusicWorkStep(stepValue);
    assertValidMusicWorkStepForm(step, getValidationValue(formData));
    const existingDraft = await getExistingDraft(currentContentId);
    if (currentContentId && !existingDraft) {
      throw new Error(
        "Existing content could not be loaded. Refresh the editor before saving.",
      );
    }
    draft = applyStepDraft(
      existingDraft ?? getDefaultDraft(formData),
      formData,
      step,
    );
    await assertUniqueContentId(draft.contentId, currentContentId);
    await saveMusicWork({
      currentContentId,
      work: draft,
    });
  } catch (error) {
    console.error("Failed to save music work step.", error);
    redirectWithActionError(
      getEditorErrorPath(currentContentId, stepValue || undefined),
      error,
      "Database error.",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/sound");
  if (draft.path) {
    revalidatePath(`/sound/${draft.path}`);
  }

  redirectWithActionSuccess(
    `/admin/content/${encodeURIComponent(draft.contentId)}?step=${step}`,
    `Saved ${step}.`,
  );
}

export async function deleteMusicWorkAction(formData: FormData) {
  await requireAdminSession();

  const contentId = getString(formData, "contentId");
  const path = getOptionalString(formData, "path");
  if (!contentId) {
    redirectWithActionError(
      "/admin/content",
      new Error("Content ID is required."),
      "Content ID is required.",
    );
  }

  try {
    await deleteMusicWork(contentId);
  } catch (error) {
    console.error("Failed to delete music work.", error);
    redirectWithActionError("/admin/content", error, "Database error.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/sound");
  if (path) {
    revalidatePath(`/sound/${path}`);
  }
  redirect("/admin/content");
}

export async function clearMusicWorkStepAction(formData: FormData) {
  await requireAdminSession();

  const contentId = getString(formData, "contentId");
  const path = getOptionalString(formData, "path");
  const step = parseMusicWorkStep(getString(formData, "adminStep"));
  const redirectPath = `/admin/content/${encodeURIComponent(
    contentId,
  )}?step=${encodeURIComponent(step)}`;

  if (!contentId) {
    redirectWithActionError(
      "/admin/content",
      new Error("Content ID is required."),
      "Content ID is required.",
    );
  }

  try {
    await clearMusicWorkStep(contentId, step);
  } catch (error) {
    console.error("Failed to clear music work step.", error);
    redirectWithActionError(redirectPath, error, "Database error.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${contentId}`);
  revalidatePath("/sound");
  if (path) {
    revalidatePath(`/sound/${path}`);
  }

  redirectWithActionSuccess(redirectPath, `Cleared ${step}.`);
}

export async function saveAdminPromptAction(formData: FormData) {
  await requireAdminSession();

  const errorPath = getString(formData, "errorPath") || getPromptErrorPath();
  const currentKey = getOptionalString(formData, "currentKey");
  const task = getString(formData, "task");
  const variant = getString(formData, "variant") || DEFAULT_PROMPT_VARIANT;
  const key = `${task}.${variant}`;
  const title = getString(formData, "title");
  const model = getString(formData, "model") || "gpt-5";
  const content = getFormString(formData, "content").trim();
  const description = getOptionalString(formData, "description");
  const enabled = getBoolean(formData, "enabled");
  const isDefault = getBoolean(formData, "isDefault");

  try {
    if (!task) throw new Error("Prompt task is required.");
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(task)) {
      throw new Error(
        "Prompt task may only contain letters, numbers, dots, underscores, and dashes.",
      );
    }
    if (!variant) throw new Error("Prompt variant is required.");
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(variant)) {
      throw new Error(
        "Prompt variant may only contain letters, numbers, dots, underscores, and dashes.",
      );
    }
    if (!title) throw new Error("Prompt title is required.");
    if (!model) throw new Error("Model is required.");
    if (!content) throw new Error("Prompt content is required.");

    await upsertAdminPrompt({
      content,
      currentKey,
      description,
      enabled,
      isDefault,
      key,
      model,
      task,
      title,
      variant,
    });
  } catch (error) {
    console.error(
      "Failed to save admin prompt.",
      getActionErrorMessage(error, ""),
    );
    redirectWithActionError(errorPath, error, "Database error.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/prompts");
  redirectWithActionSuccess(getPromptEditorPath(key), "Prompt saved.");
}

export async function deleteAdminPromptAction(formData: FormData) {
  await requireAdminSession();

  const key = getString(formData, "key");

  try {
    if (!key) throw new Error("Prompt key is required.");
    await deleteAdminPromptByKey(key);
  } catch (error) {
    console.error("Failed to delete admin prompt.", error);
    redirectWithActionError(getPromptErrorPath(), error, "Database error.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/prompts");
  redirectWithActionSuccess(getPromptErrorPath(), "Prompt deleted.");
}

export async function saveAdminYoutubeLocaleAction(formData: FormData) {
  await requireAdminSession();

  const locale = getString(formData, "locale");
  const label =
    getOptionalString(formData, "label") ??
    getYoutubeLanguageCatalogLabel(locale);
  const position = Number.parseInt(getString(formData, "position"), 10) || 0;
  const enabled = getBoolean(formData, "enabled");

  try {
    if (!locale) throw new Error("Locale is required.");
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(locale)) {
      throw new Error("Locale must look like en-US, zh-CN, ja-JP, or ru-RU.");
    }
    if (!label) throw new Error("Label is required.");

    await upsertAdminYoutubeLocale({
      enabled,
      label,
      locale,
      position,
    });
  } catch (error) {
    console.error("Failed to save YouTube localization language.", error);
    redirectWithActionError(getYoutubeI18nPath(), error, "Database error.");
  }

  revalidatePath("/admin");
  revalidatePath(getYoutubeI18nPath());
  revalidatePath("/admin/content");
  redirectWithActionSuccess(getYoutubeI18nPath(), "YouTube language saved.");
}

export async function deleteAdminYoutubeLocaleAction(formData: FormData) {
  await requireAdminSession();

  const locale = getString(formData, "locale");

  try {
    if (!locale) throw new Error("Locale is required.");
    await deleteAdminYoutubeLocale(locale);
  } catch (error) {
    console.error("Failed to delete YouTube localization language.", error);
    redirectWithActionError(getYoutubeI18nPath(), error, "Database error.");
  }

  revalidatePath("/admin");
  revalidatePath(getYoutubeI18nPath());
  revalidatePath("/admin/content");
  redirectWithActionSuccess(
    getYoutubeI18nPath(),
    "YouTube language removed from the default editor list. Existing per-work localizations were not deleted.",
  );
}
