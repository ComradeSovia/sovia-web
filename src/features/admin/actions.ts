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
  clearAdminSession,
  createPasswordAdminSession,
  requireAdminSession,
} from "./data/auth";
import {
  deleteMusicWork,
  listAdminMusicWorks,
  saveMusicWork,
} from "./data/music-admin";

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

function getActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function redirectWithActionError(
  path: string,
  error: unknown,
  fallback: string,
): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(
    `${path}${separator}message=${encodeURIComponent(
      getActionErrorMessage(error, fallback),
    )}`,
  );
}

function getEditorErrorPath(contentId?: string, step?: string) {
  const base = contentId
    ? `/admin/content/${encodeURIComponent(contentId)}`
    : "/admin/content/new";

  return step ? `${base}?step=${encodeURIComponent(step)}` : base;
}

const YOUTUBE_LOCALIZATION_FIELDS = [
  "title",
  "description",
] as const satisfies (keyof YoutubeLocalizationContent)[];

const MUSIC_WORK_STEPS = [
  "metadata",
  "status",
  "from",
  "description",
  "lyrics",
  "related",
  "youtube",
  "bilibili",
  "vk",
  "pixiv",
  "subtitles",
] as const;

type MusicWorkStep = (typeof MUSIC_WORK_STEPS)[number];

const WORK_TYPES = ["O", "CO", "R", "LC", "C"] as const;
const FROM_TYPES = ["Original", "Anime", "Game", "Pop", "Meme"] as const;

function matchMusicWorkStep(value: string): MusicWorkStep {
  if (MUSIC_WORK_STEPS.includes(value as MusicWorkStep)) {
    return value as MusicWorkStep;
  }

  throw new Error("Invalid music work step.");
}

function parseYoutubeLocalization(formData: FormData) {
  const youtubeLocalization: MusicWorkYoutubeLocalization = {};

  for (const locale of SITE_LOCALES) {
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

  return youtubeLocalization;
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

  const works = await listAdminMusicWorks();
  const work = works.find((item) => item.contentId === contentId);

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

  if (!path) {
    throw new Error("Path is required.");
  }
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
      draft.relatedWorkUids = getOptionalString(formData, "relatedWorkUids");
      break;
    case "subtitles":
      draft.subtitleTracks = parseSubtitleTracks(formData);
      break;
    case "youtube":
      draft.u2bId = getOptionalString(formData, "u2bId");
      draft.youtubeLocalization = parseYoutubeLocalization(formData);
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
      break;
  }

  if (!draft.path) {
    throw new Error("Path is required.");
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
  const youtubeLocalization = parseYoutubeLocalization(formData);
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

  if (!path) {
    redirectWithActionError(
      getEditorErrorPath(currentContentId ?? contentId),
      new Error("Path is required."),
      "Path is required.",
    );
  }
  if (!contentId) {
    redirectWithActionError(
      getEditorErrorPath(currentContentId),
      new Error("Content ID is required."),
      "Content ID is required.",
    );
  }

  try {
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
        productionNotes: getString(formData, "productionNotes"),
        relatedWorkUids: getOptionalString(formData, "relatedWorkUids"),
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
  revalidatePath(`/sound/${path}`);

  if (!currentContentId || currentContentId !== contentId) {
    redirect(`/admin/content/${encodeURIComponent(contentId)}`);
  }
}

export async function saveMusicWorkStepAction(formData: FormData) {
  await requireAdminSession();

  const stepValue = getString(formData, "adminStep");
  const currentContentId = getOptionalString(formData, "currentContentId");
  let step: MusicWorkStep;
  let draft: MusicWorkDraft;

  try {
    step = matchMusicWorkStep(stepValue);
    const existingDraft = await getExistingDraft(currentContentId);
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
  revalidatePath(`/sound/${draft.path}`);

  if (!currentContentId || currentContentId !== draft.contentId) {
    redirect(
      `/admin/content/${encodeURIComponent(draft.contentId)}?step=${step}`,
    );
  }
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
