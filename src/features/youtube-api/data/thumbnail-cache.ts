import fs from "node:fs/promises";
import path from "node:path";
import { DATA_CACHE_DIR } from "@sovia/shared/config/data";
import sharp from "sharp";

const THUMBNAIL_CACHE_DIR = path.join(DATA_CACHE_DIR, "u2b-thumbnail");
const THUMBNAIL_SOURCES = [
  "maxresdefault.jpg",
  "hqdefault.jpg",
  "mqdefault.jpg",
];

export function getYouTubeThumbnailCachePath(videoId: string) {
  return path.join(THUMBNAIL_CACHE_DIR, `${videoId}.jpg`);
}

export function getYouTubeThumbnailBlurCachePath(videoId: string) {
  return path.join(THUMBNAIL_CACHE_DIR, `${videoId}.blur.txt`);
}

async function createBlurDataUrl(bytes: Buffer) {
  const blurBytes = await sharp(bytes)
    .resize({ width: 16, withoutEnlargement: true })
    .jpeg({ quality: 35, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${blurBytes.toString("base64")}`;
}

export async function readYouTubeThumbnailBlurDataUrl(videoId: string) {
  try {
    return await fs.readFile(getYouTubeThumbnailBlurCachePath(videoId), "utf8");
  } catch {
    return null;
  }
}

async function writeThumbnailCache(videoId: string, bytes: Buffer) {
  await fs.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
  await fs.writeFile(getYouTubeThumbnailCachePath(videoId), bytes);

  const blurDataUrl = await createBlurDataUrl(bytes);
  await fs.writeFile(
    getYouTubeThumbnailBlurCachePath(videoId),
    blurDataUrl,
    "utf8",
  );

  return blurDataUrl;
}

async function ensureBlurCache(videoId: string, bytes: Buffer) {
  const cachedBlur = await readYouTubeThumbnailBlurDataUrl(videoId);

  if (cachedBlur) {
    return cachedBlur;
  }

  const blurDataUrl = await createBlurDataUrl(bytes);
  await fs.writeFile(
    getYouTubeThumbnailBlurCachePath(videoId),
    blurDataUrl,
    "utf8",
  );

  return blurDataUrl;
}

export async function ensureYouTubeThumbnailCache(videoId: string) {
  try {
    const bytes = await fs.readFile(getYouTubeThumbnailCachePath(videoId));
    const blurDataUrl = await ensureBlurCache(videoId, bytes);

    return { blurDataUrl, bytes, exists: true };
  } catch {}

  for (const file of THUMBNAIL_SOURCES) {
    const url = `https://img.youtube.com/vi/${videoId}/${file}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "force-cache",
    });

    if (res.ok) {
      const bytes = Buffer.from(await res.arrayBuffer());
      const blurDataUrl = await writeThumbnailCache(videoId, bytes);

      return { blurDataUrl, bytes, exists: true };
    }
  }

  return { blurDataUrl: null, bytes: null, exists: false };
}
