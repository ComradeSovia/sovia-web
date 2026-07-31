import {
  ensureYouTubeThumbnailCache,
  readYouTubeThumbnailCacheEntries,
} from "@sovia/youtube-api";
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

  if (format === "blur") {
    const cached = (await readYouTubeThumbnailCacheEntries([videoId])).get(
      videoId,
    );
    if (cached?.status === "available" && cached.blurDataUrl) {
      return new NextResponse(cached.blurDataUrl, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": CACHE_CONTROL,
        },
      });
    }
  }

  const thumbnail = await ensureYouTubeThumbnailCache(videoId);

  if (!thumbnail.exists || !thumbnail.bytes) {
    const retryable =
      thumbnail.status === "failed" || thumbnail.status === "pending";
    return new NextResponse(
      retryable
        ? "Thumbnail is temporarily unavailable"
        : "Thumbnail not found",
      {
        headers: retryable ? { "Retry-After": "300" } : undefined,
        status: retryable ? 503 : 404,
      },
    );
  }

  if (format === "blur") {
    return new NextResponse(thumbnail.blurDataUrl, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  return new NextResponse(new Uint8Array(thumbnail.bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
