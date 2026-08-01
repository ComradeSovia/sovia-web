const YOUTUBE_THUMBNAIL_CACHE_VERSION = "2";

export function getYouTubeThumbnailApiUrl(videoId: string, format?: "blur") {
  const params = new URLSearchParams({
    id: videoId,
    v: YOUTUBE_THUMBNAIL_CACHE_VERSION,
  });
  if (format) params.set("format", format);

  return `/api/u2b-thumbnail?${params}`;
}
