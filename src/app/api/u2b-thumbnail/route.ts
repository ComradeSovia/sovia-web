import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { DATA_CACHE_DIR } from "@/config/data";

const THUMBNAIL_CACHE_DIR = path.join(DATA_CACHE_DIR, "u2b-thumbnail");

function getThumbnailCachePath(videoId: string) {
  return path.join(THUMBNAIL_CACHE_DIR, `${videoId}.jpg`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("id");

  if (!videoId || !/^[\w-]+$/.test(videoId)) {
    return new NextResponse("Missing video id", { status: 400 });
  }

  const cachePath = getThumbnailCachePath(videoId);

  try {
    const cached = await fs.readFile(cachePath);
    return new NextResponse(cached, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {}

  const sources = ["maxresdefault.jpg", "hqdefault.jpg", "mqdefault.jpg"];

  for (const file of sources) {
    const url = `https://img.youtube.com/vi/${videoId}/${file}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "force-cache",
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const bytes = Buffer.from(buffer);

      await fs.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
      await fs.writeFile(cachePath, bytes);

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  }

  return new NextResponse("Thumbnail not found", { status: 404 });
}
