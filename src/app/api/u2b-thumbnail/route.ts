import { ensureYouTubeThumbnailCache } from "@sovia/sound/data/thumbnail-cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=2592000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("id");
  const format = searchParams.get("format");

  if (!videoId || !/^[\w-]+$/.test(videoId)) {
    return new NextResponse("Missing video id", { status: 400 });
  }

  if (format && format !== "blur") {
    return new NextResponse("Unsupported thumbnail format", { status: 400 });
  }

  const thumbnail = await ensureYouTubeThumbnailCache(videoId);

  if (!thumbnail.exists || !thumbnail.bytes) {
    return new NextResponse("Thumbnail not found", { status: 404 });
  }

  if (format === "blur") {
    return new NextResponse(thumbnail.blurDataUrl, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  return new NextResponse(thumbnail.bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
