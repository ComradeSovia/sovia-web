import fs from "node:fs";
import path from "node:path";
import type { MusicWork } from "@/definitions/data-type/music";
import { DATA_MUSIC_META } from "@/config/data";

const MUSIC_DIR = path.join(process.cwd(), DATA_MUSIC_META);

/* -------------------------
   Cache structures
------------------------- */

type FileMeta = {
  size: number;
};

type CachedWork = {
  work: MusicWork;
};

type ThumbnailCacheEntry = {
  exists: boolean;
  checkedAt: number;
};

let lastDirCheck = 0;
let fileMetaCache = new Map<string, FileMeta>();
let workCache = new Map<string, CachedWork>();
let thumbnailCache = new Map<string, ThumbnailCacheEntry>();

const DIR_CHECK_INTERVAL = 5 * 60 * 1000; // 5 min
const THUMB_OK_TTL = 60 * 60 * 1000; // 1 hour
const THUMB_FAIL_TTL = 5 * 60 * 1000; // 5 min

/* -------------------------
   YouTube probe
------------------------- */

async function checkYouTubeThumbnail(videoId: string): Promise<boolean> {
  const cached = thumbnailCache.get(videoId);
  const now = Date.now();

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
    }
  );

  const exists = res.ok;

  thumbnailCache.set(videoId, {
    exists,
    checkedAt: now,
  });

  return exists;
}

/* -------------------------
   Directory + JSON loader
------------------------- */

function refreshDirectoryIfNeeded() {
  const now = Date.now();
  if (now - lastDirCheck < DIR_CHECK_INTERVAL) {
    return;
  }

  lastDirCheck = now;

  const files = fs.readdirSync(MUSIC_DIR).filter((f) => f.endsWith(".json"));
  const currentSet = new Set(files);

  // Remove deleted files
  for (const key of fileMetaCache.keys()) {
    if (!currentSet.has(key)) {
      fileMetaCache.delete(key);
      workCache.delete(key);
    }
  }

  // Add or update changed files
  for (const file of files) {
    const filePath = path.join(MUSIC_DIR, file);
    const stat = fs.statSync(filePath);

    const prev = fileMetaCache.get(file);
    if (!prev || prev.size !== stat.size) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const work = JSON.parse(raw) as MusicWork;

      fileMetaCache.set(file, { size: stat.size });
      workCache.set(file, { work });
    }
  }
}

/* -------------------------
   Public API
------------------------- */

export async function loadAllMusicWorks(): Promise<MusicWork[]> {
  refreshDirectoryIfNeeded();

  const result: MusicWork[] = [];

  for (const { work } of workCache.values()) {
    if (!work.u2bId) continue;

    const ok = await checkYouTubeThumbnail(work.u2bId);
    if (!ok) continue;

    result.push(work);
  }

  return result;
}
