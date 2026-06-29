import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "data");
const DATA_LIST_FILE = path.join(DATA_DIR, "list.json");
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

async function main() {
  const list = JSON.parse(await fs.readFile(DATA_LIST_FILE, "utf8"));
  const videoIds = Array.from(
    new Set(
      list
        .map((work) => work.u2bId)
        .filter((videoId) => typeof videoId === "string" && videoId.length > 0),
    ),
  ).slice(0, parseLimit());

  await fs.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });

  const summary = {
    blurred: 0,
    cached: 0,
    fetched: 0,
    missing: 0,
  };

  for (const [index, videoId] of videoIds.entries()) {
    const status = await prewarmThumbnail(videoId);
    summary[status] += 1;
    console.log(`${index + 1}/${videoIds.length} ${videoId} ${status}`);
  }

  console.log(
    `Done. fetched=${summary.fetched} blurred=${summary.blurred} cached=${summary.cached} missing=${summary.missing}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
