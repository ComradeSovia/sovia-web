import fs from "node:fs";
import path from "node:path";
import { DATA_CACHE_DIR, DATA_LIST_FILE, DATA_WORKS_DIR } from "@/config/data";
import type {
  MusicWork,
  MusicWorkWithContent,
} from "@/definitions/data-type/music";

const LIST_FILE_PATH = path.join(process.cwd(), DATA_LIST_FILE);
const WORKS_DIR_PATH = path.join(process.cwd(), DATA_WORKS_DIR);
const THUMBNAIL_CACHE_DIR = path.join(
  process.cwd(),
  DATA_CACHE_DIR,
  "u2b-thumbnail",
);

/* -------------------------
   Cache structures
------------------------- */

type ListCacheEntry = {
  works: MusicWork[];
  mtime: number;
};

type ThumbnailCacheEntry = {
  exists: boolean;
  checkedAt: number;
};

let listCache: ListCacheEntry | null = null;
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

/* -------------------------
   Load list.json with cache
------------------------- */

function loadMusicList(): MusicWork[] {
  if (!fs.existsSync(LIST_FILE_PATH)) {
    console.warn(`Music list file not found: ${LIST_FILE_PATH}`);
    return [];
  }

  const stat = fs.statSync(LIST_FILE_PATH);
  const currentMtime = stat.mtimeMs;

  // Check cache
  if (listCache && listCache.mtime === currentMtime) {
    return listCache.works;
  }

  // Load and parse
  const content = fs.readFileSync(LIST_FILE_PATH, "utf-8");
  const works = JSON.parse(content) as MusicWork[];

  // Update cache
  listCache = {
    works,
    mtime: currentMtime,
  };

  return works;
}

/* -------------------------
   Load markdown content
------------------------- */

function loadMarkdownContent(
  contentKey: string,
  type: "description" | "lyrics",
): Record<string, string> {
  const workDir = path.join(WORKS_DIR_PATH, contentKey);

  if (!fs.existsSync(workDir)) {
    return {};
  }

  const files = fs.readdirSync(workDir);
  const pattern = new RegExp(`^${type}\\.(\\w+)\\.md$`);
  const result: Record<string, string> = {};

  for (const file of files) {
    const match = pattern.exec(file);
    if (match) {
      const language = match[1];
      const filePath = path.join(workDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      result[language] = content;
    }
  }

  return result;
}

/* -------------------------
   Public API
------------------------- */

export async function loadAllMusicWorks(): Promise<MusicWork[]> {
  const works = loadMusicList();

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

export function loadMusicWorkWithContent(
  workPath: string,
): MusicWorkWithContent | null {
  const works = loadMusicList();
  const work = works.find((w) => w.path === workPath);

  if (!work) {
    return null;
  }

  const descriptions = loadMarkdownContent(work.vid, "description");
  const lyrics = loadMarkdownContent(work.vid, "lyrics");
  const availableLanguages = Array.from(
    new Set([...Object.keys(descriptions), ...Object.keys(lyrics)]),
  );

  return {
    ...work,
    descriptions,
    lyrics,
    availableLanguages,
  };
}

export function getAvailableLanguages(workPath: string): string[] {
  const workWithContent = loadMusicWorkWithContent(workPath);
  return workWithContent?.availableLanguages || [];
}
