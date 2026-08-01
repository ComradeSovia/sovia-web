import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DATA_CACHE_DIR } from "@sovia/shared/config/data";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import sharp from "sharp";

const THUMBNAIL_CACHE_DIR = path.join(DATA_CACHE_DIR, "u2b-thumbnail");
const THUMBNAIL_SOURCES = [
  "maxresdefault.jpg",
  "hqdefault.jpg",
  "mqdefault.jpg",
] as const;
const DOWNLOAD_LEASE_MS = 2 * 60 * 1000;
const MISSING_RETRY_MS = 24 * 60 * 60 * 1000;
const FAILED_RETRY_BASE_MS = 5 * 60 * 1000;
const FAILED_RETRY_MAX_MS = 12 * 60 * 60 * 1000;

export type YouTubeThumbnailCacheStatus =
  | "available"
  | "failed"
  | "missing"
  | "pending";

export type YouTubeThumbnailCacheEntry = {
  availabilityCheckedAt: Date | null;
  availabilityNextCheckAt: Date | null;
  availabilityStatus: string;
  blurDataUrl: string | null;
  checkedAt: Date | null;
  downloadedAt: Date | null;
  nextRetryAt: Date | null;
  status: YouTubeThumbnailCacheStatus;
  videoId: string;
};

type ThumbnailResult = {
  blurDataUrl: string | null;
  bytes: Buffer | null;
  exists: boolean;
  status: YouTubeThumbnailCacheStatus;
};

export function getYouTubeThumbnailCachePath(videoId: string) {
  return path.join(THUMBNAIL_CACHE_DIR, `${videoId}.jpg`);
}

export function getYouTubeThumbnailBlurCachePath(videoId: string) {
  return path.join(THUMBNAIL_CACHE_DIR, `${videoId}.blur.txt`);
}

function getThumbnailStorageKey(videoId: string) {
  return `u2b-thumbnail/${videoId}.jpg`;
}

async function createBlurDataUrl(bytes: Buffer) {
  const blurBytes = await sharp(bytes)
    .resize({ width: 16, withoutEnlargement: true })
    .jpeg({ quality: 35, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${blurBytes.toString("base64")}`;
}

export async function readYouTubeThumbnailBlurDataUrl(videoId: string) {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const cached = await prisma.youtubeThumbnailCache.findUnique({
        select: { blurDataUrl: true },
        where: { videoId },
      });
      if (cached?.blurDataUrl) return cached.blurDataUrl;
    } catch {}
  }

  try {
    return await fs.readFile(getYouTubeThumbnailBlurCachePath(videoId), "utf8");
  } catch {
    return null;
  }
}

export async function readYouTubeThumbnailCacheEntries(
  videoIds: readonly string[],
) {
  const uniqueIds = Array.from(new Set(videoIds.filter(Boolean)));
  const entries = new Map<string, YouTubeThumbnailCacheEntry>();
  if (!uniqueIds.length) return entries;

  const prisma = getPrismaClient();
  if (!prisma) return entries;

  try {
    const cached = await prisma.youtubeThumbnailCache.findMany({
      select: {
        availabilityCheckedAt: true,
        availabilityNextCheckAt: true,
        availabilityStatus: true,
        blurDataUrl: true,
        checkedAt: true,
        downloadedAt: true,
        nextRetryAt: true,
        status: true,
        videoId: true,
      },
      where: { videoId: { in: uniqueIds } },
    });

    for (const item of cached) {
      if (!isThumbnailStatus(item.status)) continue;
      entries.set(item.videoId, {
        ...item,
        status: item.status,
      });
    }
  } catch {}

  return entries;
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

async function ensureBlurCache(
  videoId: string,
  bytes: Buffer,
  knownBlurDataUrl?: string | null,
) {
  const cachedBlur =
    knownBlurDataUrl ??
    (await fs
      .readFile(getYouTubeThumbnailBlurCachePath(videoId), "utf8")
      .catch(() => null));

  if (cachedBlur) return cachedBlur;

  const blurDataUrl = await createBlurDataUrl(bytes);
  await fs.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
  await fs.writeFile(
    getYouTubeThumbnailBlurCachePath(videoId),
    blurDataUrl,
    "utf8",
  );

  return blurDataUrl;
}

async function readLocalThumbnail(
  videoId: string,
  cached: { blurDataUrl: string | null; status: string } | null,
) {
  try {
    const bytes = await fs.readFile(getYouTubeThumbnailCachePath(videoId));
    const blurDataUrl = await ensureBlurCache(
      videoId,
      bytes,
      cached?.blurDataUrl,
    );
    if (cached?.status !== "available" || !cached.blurDataUrl) {
      await recordAvailableThumbnail({
        blurDataUrl,
        bytes,
        contentType: "image/jpeg",
        sourceVariant: null,
        videoId,
      });
    }
    return {
      blurDataUrl,
      bytes,
      exists: true,
      status: "available",
    } satisfies ThumbnailResult;
  } catch {
    return null;
  }
}

export async function ensureYouTubeThumbnailCache(
  videoId: string,
): Promise<ThumbnailResult> {
  const cached = await readYouTubeThumbnailCacheEntry(videoId);
  const local = await readLocalThumbnail(videoId, cached);
  if (local) return local;

  const now = new Date();
  if (
    cached &&
    (cached.status === "missing" || cached.status === "failed") &&
    cached.nextRetryAt &&
    cached.nextRetryAt > now
  ) {
    return {
      blurDataUrl: cached.blurDataUrl,
      bytes: null,
      exists: false,
      status: cached.status,
    };
  }
  if (
    cached?.status === "pending" &&
    cached.leaseUntil &&
    cached.leaseUntil > now
  ) {
    return {
      blurDataUrl: cached.blurDataUrl,
      bytes: null,
      exists: false,
      status: "pending",
    };
  }

  const claimed = await claimThumbnailDownload(videoId, now);
  if (!claimed) {
    return {
      blurDataUrl: cached?.blurDataUrl ?? null,
      bytes: null,
      exists: false,
      status: "pending",
    };
  }

  let lastHttpStatus: number | null = null;
  try {
    for (const sourceVariant of THUMBNAIL_SOURCES) {
      const response = await fetch(
        `https://img.youtube.com/vi/${videoId}/${sourceVariant}`,
        {
          cache: "no-store",
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(10_000),
        },
      );
      lastHttpStatus = response.status;
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) continue;
        throw new Error(
          `YouTube thumbnail ${sourceVariant} returned ${response.status}.`,
        );
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      const blurDataUrl = await writeThumbnailCache(videoId, bytes);
      await recordAvailableThumbnail({
        blurDataUrl,
        bytes,
        contentType: response.headers.get("content-type") ?? "image/jpeg",
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        sourceVariant,
        videoId,
      });

      return { blurDataUrl, bytes, exists: true, status: "available" };
    }

    await recordMissingThumbnail(videoId, lastHttpStatus);
    return {
      blurDataUrl: null,
      bytes: null,
      exists: false,
      status: "missing",
    };
  } catch (error) {
    await recordFailedThumbnail(
      videoId,
      error,
      cached?.attemptCount ?? 0,
      lastHttpStatus,
    );
    return {
      blurDataUrl: null,
      bytes: null,
      exists: false,
      status: "failed",
    };
  }
}

async function readYouTubeThumbnailCacheEntry(videoId: string) {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    return await prisma.youtubeThumbnailCache.findUnique({
      where: { videoId },
    });
  } catch {
    return null;
  }
}

async function claimThumbnailDownload(videoId: string, now: Date) {
  const prisma = getPrismaClient();
  if (!prisma) return true;

  const leaseUntil = new Date(now.getTime() + DOWNLOAD_LEASE_MS);
  const leaseToken = randomUUID();
  try {
    await prisma.youtubeThumbnailCache.upsert({
      create: {
        attemptCount: 1,
        checkedAt: now,
        leaseUntil,
        leaseToken,
        status: "pending",
        videoId,
      },
      update: {},
      where: { videoId },
    });
    const claimed = await prisma.youtubeThumbnailCache.updateMany({
      data: {
        attemptCount: { increment: 1 },
        checkedAt: now,
        failureReason: null,
        leaseUntil,
        leaseToken,
        status: "pending",
      },
      where: {
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
        videoId,
      },
    });

    const current = await prisma.youtubeThumbnailCache.findUnique({
      select: { leaseToken: true, status: true },
      where: { videoId },
    });
    return (
      claimed.count > 0 ||
      (current?.status === "pending" && current.leaseToken === leaseToken)
    );
  } catch {
    return true;
  }
}

async function recordAvailableThumbnail({
  blurDataUrl,
  bytes,
  contentType,
  etag = null,
  lastModified = null,
  sourceVariant,
  videoId,
}: {
  blurDataUrl: string;
  bytes: Buffer;
  contentType: string;
  etag?: string | null;
  lastModified?: string | null;
  sourceVariant: string | null;
  videoId: string;
}) {
  const prisma = getPrismaClient();
  if (!prisma) return;

  try {
    const metadata = await sharp(bytes).metadata();
    const now = new Date();
    await prisma.youtubeThumbnailCache.upsert({
      create: {
        attemptCount: 1,
        blurDataUrl,
        byteSize: bytes.byteLength,
        checkedAt: now,
        contentType,
        downloadedAt: now,
        etag,
        height: metadata.height,
        lastModified,
        sourceVariant,
        status: "available",
        storageKey: getThumbnailStorageKey(videoId),
        videoId,
        width: metadata.width,
      },
      update: {
        blurDataUrl,
        byteSize: bytes.byteLength,
        checkedAt: now,
        contentType,
        downloadedAt: now,
        etag,
        failedAt: null,
        failureReason: null,
        height: metadata.height,
        httpStatus: 200,
        lastModified,
        leaseUntil: null,
        leaseToken: null,
        nextRetryAt: null,
        sourceVariant,
        status: "available",
        storageKey: getThumbnailStorageKey(videoId),
        width: metadata.width,
      },
      where: { videoId },
    });
  } catch {}
}

async function recordMissingThumbnail(
  videoId: string,
  httpStatus: number | null,
) {
  const prisma = getPrismaClient();
  if (!prisma) return;

  const now = new Date();
  try {
    await prisma.youtubeThumbnailCache.upsert({
      create: {
        attemptCount: 1,
        checkedAt: now,
        failedAt: now,
        failureReason: "No YouTube thumbnail variant was available.",
        httpStatus,
        nextRetryAt: new Date(now.getTime() + MISSING_RETRY_MS),
        status: "missing",
        videoId,
      },
      update: {
        checkedAt: now,
        failedAt: now,
        failureReason: "No YouTube thumbnail variant was available.",
        httpStatus,
        leaseUntil: null,
        leaseToken: null,
        nextRetryAt: new Date(now.getTime() + MISSING_RETRY_MS),
        status: "missing",
      },
      where: { videoId },
    });
  } catch {}
}

async function recordFailedThumbnail(
  videoId: string,
  error: unknown,
  previousAttemptCount: number,
  httpStatus: number | null,
) {
  const prisma = getPrismaClient();
  if (!prisma) return;

  const now = new Date();
  const retryMs = Math.min(
    FAILED_RETRY_BASE_MS * 2 ** Math.min(previousAttemptCount, 8),
    FAILED_RETRY_MAX_MS,
  );
  try {
    await prisma.youtubeThumbnailCache.upsert({
      create: {
        attemptCount: 1,
        checkedAt: now,
        failedAt: now,
        failureReason: getErrorMessage(error),
        httpStatus,
        nextRetryAt: new Date(now.getTime() + retryMs),
        status: "failed",
        videoId,
      },
      update: {
        checkedAt: now,
        failedAt: now,
        failureReason: getErrorMessage(error),
        httpStatus,
        leaseUntil: null,
        leaseToken: null,
        nextRetryAt: new Date(now.getTime() + retryMs),
        status: "failed",
      },
      where: { videoId },
    });
  } catch {}
}

function isThumbnailStatus(
  value: string,
): value is YouTubeThumbnailCacheStatus {
  return ["available", "failed", "missing", "pending"].includes(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message.slice(0, 500)
    : "Thumbnail download failed.";
}
