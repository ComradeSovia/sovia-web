import fs from "node:fs";
import { getYouTubeThumbnailCachePath } from "./thumbnail-cache";

type YouTubePublicationCacheEntry = {
  checkedAt: number;
  published: boolean;
};

export type YouTubePublicationStatus =
  | {
      reason: "no-video-id";
      status: "unknown";
    }
  | {
      reason: "thumbnail-found" | "thumbnail-missing" | "probe-failed";
      status: "published" | "not-published" | "unknown";
    };

const publicationCache = new Map<string, YouTubePublicationCacheEntry>();
const YOUTUBE_OK_TTL_MS = 60 * 60 * 1000;
const YOUTUBE_FAIL_TTL_MS = 5 * 60 * 1000;

export async function checkYouTubeVideoPublished(
  videoId?: string | null,
): Promise<YouTubePublicationStatus> {
  if (!videoId) {
    return { reason: "no-video-id", status: "unknown" };
  }

  const now = Date.now();
  const cached = publicationCache.get(videoId);

  if (fs.existsSync(getYouTubeThumbnailCachePath(videoId))) {
    publicationCache.set(videoId, { checkedAt: now, published: true });
    return { reason: "thumbnail-found", status: "published" };
  }

  if (cached) {
    const ttl = cached.published ? YOUTUBE_OK_TTL_MS : YOUTUBE_FAIL_TTL_MS;
    if (now - cached.checkedAt < ttl) {
      return {
        reason: cached.published ? "thumbnail-found" : "thumbnail-missing",
        status: cached.published ? "published" : "not-published",
      };
    }
  }

  let published = false;

  try {
    const response = await fetch(
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        method: "HEAD",
        next: { revalidate: 0 },
      },
    );
    published = response.ok;
  } catch {
    return { reason: "probe-failed", status: "unknown" };
  }

  publicationCache.set(videoId, {
    checkedAt: now,
    published,
  });

  return {
    reason: published ? "thumbnail-found" : "thumbnail-missing",
    status: published ? "published" : "not-published",
  };
}
