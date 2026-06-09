import fs from "node:fs";
import path from "node:path";
import { DATA_CACHE_DIR } from "@sovia/shared/config/data";
import type { MusicWork, MusicWorkWithContent } from "../model/music";
import { getMusicWorkByPath, listMusicWorks } from "./music-repository";

const THUMBNAIL_CACHE_DIR = path.join(DATA_CACHE_DIR, "u2b-thumbnail");

type ThumbnailCacheEntry = {
  exists: boolean;
  checkedAt: number;
};

const thumbnailCache = new Map<string, ThumbnailCacheEntry>();

const THUMB_OK_TTL = 60 * 60 * 1000; // 1 hour
const THUMB_FAIL_TTL = 5 * 60 * 1000; // 5 min

/* -------------------------
   YouTube probe
------------------------- */

async function checkYouTubeThumbnail(videoId: string): Promise<boolean> {
  const cached = thumbnailCache.get(videoId);
  const now = Date.now();
  const cachePath = path.join(THUMBNAIL_CACHE_DIR, `${videoId}.jpg`);

  if (fs.existsSync(cachePath)) {
    thumbnailCache.set(videoId, {
      exists: true,
      checkedAt: now,
    });
    return true;
  }

  if (cached) {
    const ttl = cached.exists ? THUMB_OK_TTL : THUMB_FAIL_TTL;
    if (now - cached.checkedAt < ttl) {
      return cached.exists;
    }
  }

  const res = await fetch(
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    },
  );

  const exists = res.ok;

  thumbnailCache.set(videoId, {
    exists,
    checkedAt: now,
  });

  return exists;
}

export async function loadMusicIndex(): Promise<MusicWork[]> {
  return listMusicWorks();
}

/* -------------------------
   Public API
------------------------- */

export async function loadAllMusicWorks(): Promise<MusicWork[]> {
  const works = await listMusicWorks();

  // Filter: only return works with YouTube ID and valid thumbnail
  const result: MusicWork[] = [];

  for (const work of works) {
    if (!work.u2bId) continue;

    const ok = await checkYouTubeThumbnail(work.u2bId);
    if (!ok) continue;

    result.push(work);
  }

  return result;
}

export async function loadMusicWorkWithContent(
  workPath: string,
): Promise<MusicWorkWithContent | null> {
  return getMusicWorkByPath(workPath);
}

export async function getAvailableLanguages(
  workPath: string,
): Promise<string[]> {
  const workWithContent = await loadMusicWorkWithContent(workPath);
  return workWithContent?.availableLanguages || [];
}
