"use server";

import { SITE_LOCALES } from "@sovia/shared/i18n/site-locale";
import type {
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
import { deleteMusicWork, saveMusicWork } from "./data/music-admin";

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

const YOUTUBE_LOCALIZATION_FIELDS = [
  "title",
  "description",
] as const satisfies (keyof YoutubeLocalizationContent)[];

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

  const currentPath = getOptionalString(formData, "currentPath");
  const path = getString(formData, "path");
  const vid = getOptionalString(formData, "vid") ?? path;
  const title = getString(formData, "title");
  const youtubeLocalization = parseYoutubeLocalization(formData);
  const subtitleTracks = parseSubtitleTracks(formData);

  if (!path || !title) {
    throw new Error("Path and title are required.");
  }

  try {
    await saveMusicWork({
      currentPath,
      work: {
        path,
        vid,
        title,
        original: getOptionalString(formData, "original"),
        u2bId: getOptionalString(formData, "u2bId"),
        series: getOptionalString(formData, "series"),
        bilibiliId: getOptionalString(formData, "bilibiliId"),
        inspiredByAuthor: getOptionalString(formData, "inspiredByAuthor"),
        inspiredByDetail: getOptionalString(formData, "inspiredByDetail"),
        inspiredByTitle: getOptionalString(formData, "inspiredByTitle"),
        introText: getString(formData, "introText"),
        isOriginal: getBoolean(formData, "isOriginal"),
        lyrics: getString(formData, "lyrics"),
        musicStyle: getOptionalString(formData, "musicStyle"),
        musicType: getOptionalString(formData, "musicType"),
        pixivId: getOptionalString(formData, "pixivId"),
        productionNotes: getString(formData, "productionNotes"),
        publishedAt: getOptionalString(formData, "publishedAt"),
        relatedWorkUids: getOptionalString(formData, "relatedWorkUids"),
        shortDescription: getOptionalString(formData, "shortDescription"),
        subtitleTracks,
        vkId: getOptionalString(formData, "vkId"),
        youtubeLocalization,
      },
    });
  } catch {
    redirect("/admin/content?error=database");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/sound");
  revalidatePath(`/sound/${path}`);
  redirect(`/admin/content/${encodeURIComponent(path)}`);
}

export async function deleteMusicWorkAction(formData: FormData) {
  await requireAdminSession();

  const path = getString(formData, "path");
  if (!path) {
    throw new Error("Path is required.");
  }

  try {
    await deleteMusicWork(path);
  } catch {
    redirect("/admin/content?error=database");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/sound");
  revalidatePath(`/sound/${path}`);
  redirect("/admin/content");
}
