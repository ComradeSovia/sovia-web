import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import sharp from "sharp";

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "data");
const THUMBNAIL_CACHE_DIR = path.join(DATA_DIR, "cache", "u2b-thumbnail");
const THUMBNAIL_SOURCES = [
  "maxresdefault.jpg",
  "hqdefault.jpg",
  "mqdefault.jpg",
];

function parseLimit() {
  const limitIndex = process.argv.indexOf("--limit");
  const value = limitIndex >= 0 ? process.argv[limitIndex + 1] : null;
  const parsed = value ? Number(value) : Number.POSITIVE_INFINITY;

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : Number.POSITIVE_INFINITY;
}

async function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const contents = await fs
    .readFile(path.join(process.cwd(), ".env"), "utf8")
    .catch(() => "");
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*DATABASE_URL\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (value) process.env.DATABASE_URL = value;
    return;
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createBlurDataUrl(bytes) {
  const blurBytes = await sharp(bytes)
    .resize({ width: 16, withoutEnlargement: true })
    .jpeg({ quality: 35, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${blurBytes.toString("base64")}`;
}

async function fetchThumbnail(videoId) {
  for (const source of THUMBNAIL_SOURCES) {
    const response = await fetch(
      `https://img.youtube.com/vi/${videoId}/${source}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
      },
    );

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  return null;
}

async function prewarmThumbnail(videoId) {
  const imagePath = path.join(THUMBNAIL_CACHE_DIR, `${videoId}.jpg`);
  const blurPath = path.join(THUMBNAIL_CACHE_DIR, `${videoId}.blur.txt`);
  const hasImage = await pathExists(imagePath);
  const hasBlur = await pathExists(blurPath);

  if (hasImage && hasBlur) {
    return "cached";
  }

  let bytes = hasImage ? await fs.readFile(imagePath) : null;

  if (!bytes) {
    bytes = await fetchThumbnail(videoId);

    if (!bytes) {
      return "missing";
    }

    await fs.writeFile(imagePath, bytes);
  }

  if (!hasBlur) {
    await fs.writeFile(blurPath, await createBlurDataUrl(bytes), "utf8");
  }

  return hasImage ? "blurred" : "fetched";
}

async function recordThumbnailStatus(client, videoId, status) {
  const now = new Date();
  if (status === "missing") {
    await client.query(
      `INSERT INTO "youtube_thumbnail_caches"
        ("videoId", "status", "attemptCount", "checkedAt", "failedAt", "nextRetryAt", "failureReason", "updatedAt")
       VALUES ($1, 'missing', 1, $2, $2, $3, $4, $2)
       ON CONFLICT ("videoId") DO UPDATE SET
        "status" = 'missing',
        "checkedAt" = EXCLUDED."checkedAt",
        "failedAt" = EXCLUDED."failedAt",
        "nextRetryAt" = EXCLUDED."nextRetryAt",
        "failureReason" = EXCLUDED."failureReason",
        "leaseUntil" = NULL,
        "leaseToken" = NULL,
        "updatedAt" = EXCLUDED."updatedAt"`,
      [
        videoId,
        now,
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
        "No YouTube thumbnail variant was available.",
      ],
    );
    return;
  }

  const imagePath = path.join(THUMBNAIL_CACHE_DIR, `${videoId}.jpg`);
  const blurPath = path.join(THUMBNAIL_CACHE_DIR, `${videoId}.blur.txt`);
  const [bytes, blurDataUrl, fileStat] = await Promise.all([
    fs.readFile(imagePath),
    fs.readFile(blurPath, "utf8"),
    fs.stat(imagePath),
  ]);
  const metadata = await sharp(bytes).metadata();

  await client.query(
    `INSERT INTO "youtube_thumbnail_caches"
      ("videoId", "status", "storageKey", "blurDataUrl", "contentType", "byteSize", "width", "height", "httpStatus", "attemptCount", "checkedAt", "downloadedAt", "updatedAt")
     VALUES ($1, 'available', $2, $3, 'image/jpeg', $4, $5, $6, 200, 1, $7, $8, $7)
     ON CONFLICT ("videoId") DO UPDATE SET
      "status" = 'available',
      "storageKey" = EXCLUDED."storageKey",
      "blurDataUrl" = EXCLUDED."blurDataUrl",
      "contentType" = EXCLUDED."contentType",
      "byteSize" = EXCLUDED."byteSize",
      "width" = EXCLUDED."width",
      "height" = EXCLUDED."height",
      "httpStatus" = 200,
      "checkedAt" = EXCLUDED."checkedAt",
      "downloadedAt" = EXCLUDED."downloadedAt",
      "failedAt" = NULL,
      "failureReason" = NULL,
      "nextRetryAt" = NULL,
      "leaseUntil" = NULL,
      "leaseToken" = NULL,
      "updatedAt" = EXCLUDED."updatedAt"`,
    [
      videoId,
      `u2b-thumbnail/${videoId}.jpg`,
      blurDataUrl,
      bytes.byteLength,
      metadata.width ?? null,
      metadata.height ?? null,
      now,
      fileStat.mtime,
    ],
  );
}

async function recordThumbnailFailure(client, videoId, error) {
  const now = new Date();
  await client.query(
    `INSERT INTO "youtube_thumbnail_caches"
      ("videoId", "status", "attemptCount", "checkedAt", "failedAt", "nextRetryAt", "failureReason", "updatedAt")
     VALUES ($1, 'failed', 1, $2, $2, $3, $4, $2)
     ON CONFLICT ("videoId") DO UPDATE SET
      "status" = 'failed',
      "checkedAt" = EXCLUDED."checkedAt",
      "failedAt" = EXCLUDED."failedAt",
      "nextRetryAt" = EXCLUDED."nextRetryAt",
      "failureReason" = EXCLUDED."failureReason",
      "leaseUntil" = NULL,
      "leaseToken" = NULL,
      "updatedAt" = EXCLUDED."updatedAt"`,
    [
      videoId,
      now,
      new Date(now.getTime() + 5 * 60 * 1000),
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Thumbnail prewarm failed.",
    ],
  );
}

async function refreshYouTubeAvailability(client, videoId) {
  const now = new Date();
  let availabilityStatus;
  let httpStatus = null;
  let failureReason = null;
  let nextCheckAt;

  try {
    const params = new URLSearchParams({
      format: "json",
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
    const response = await fetch(`https://www.youtube.com/oembed?${params}`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10_000),
    });
    httpStatus = response.status;
    if (response.ok) {
      availabilityStatus = "public";
      nextCheckAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    } else if ([401, 403, 404, 410].includes(response.status)) {
      availabilityStatus = "unavailable";
      nextCheckAt = new Date(now.getTime() + 60 * 60 * 1000);
    } else {
      throw new Error(
        `YouTube availability probe returned ${response.status}.`,
      );
    }
  } catch (error) {
    availabilityStatus = "failed";
    failureReason =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "YouTube availability check failed.";
    nextCheckAt = new Date(now.getTime() + 5 * 60 * 1000);
  }

  await client.query(
    `UPDATE "youtube_thumbnail_caches" SET
      "availabilityStatus" = $2,
      "availabilityAttemptCount" = "availabilityAttemptCount" + 1,
      "availabilityCheckedAt" = $3,
      "availabilityNextCheckAt" = $4,
      "availabilityHttpStatus" = $5,
      "availabilityFailureReason" = $6,
      "availabilityLeaseUntil" = NULL,
      "availabilityLeaseToken" = NULL,
      "updatedAt" = $3
     WHERE "videoId" = $1`,
    [videoId, availabilityStatus, now, nextCheckAt, httpStatus, failureReason],
  );
  return availabilityStatus;
}

async function main() {
  await ensureDatabaseUrl();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query(
    `SELECT DISTINCT "platformId"
     FROM "music_work_platforms"
     WHERE "platform" = 'youtube' AND "platformId" IS NOT NULL
     ORDER BY "platformId"`,
  );
  const videoIds = result.rows
    .map((row) => row.platformId)
    .filter((videoId) => typeof videoId === "string" && videoId.length > 0)
    .slice(0, parseLimit());

  await fs.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });

  const summary = {
    availabilityFailed: 0,
    availabilityPublic: 0,
    availabilityUnavailable: 0,
    blurred: 0,
    cached: 0,
    fetched: 0,
    missing: 0,
  };

  try {
    for (const [index, videoId] of videoIds.entries()) {
      try {
        const status = await prewarmThumbnail(videoId);
        await recordThumbnailStatus(client, videoId, status);
        const availability = await refreshYouTubeAvailability(client, videoId);
        summary[status] += 1;
        summary[
          availability === "public"
            ? "availabilityPublic"
            : availability === "unavailable"
              ? "availabilityUnavailable"
              : "availabilityFailed"
        ] += 1;
        console.log(
          `${index + 1}/${videoIds.length} ${videoId} ${status} ${availability}`,
        );
      } catch (error) {
        await recordThumbnailFailure(client, videoId, error);
        console.error(`${index + 1}/${videoIds.length} ${videoId} failed`);
      }
    }
  } finally {
    await client.end();
  }

  console.log(
    `Done. fetched=${summary.fetched} blurred=${summary.blurred} cached=${summary.cached} missing=${summary.missing} public=${summary.availabilityPublic} unavailable=${summary.availabilityUnavailable} availabilityFailed=${summary.availabilityFailed}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
