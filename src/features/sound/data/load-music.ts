import {
  checkYouTubeVideoPublished,
  ensureYouTubeThumbnailCache,
  readYouTubeThumbnailBlurDataUrl,
  readYouTubeThumbnailCacheEntries,
} from "@sovia/youtube-api";
import type { MusicWork, MusicWorkWithContent } from "../model/music";
import { listMusicWorks } from "./music-repository";

export async function loadMusicIndex(): Promise<MusicWork[]> {
  return listMusicWorks();
}

/* -------------------------
   Public API
------------------------- */

export async function loadAllMusicWorks(): Promise<MusicWork[]> {
  const works = await listMusicWorks();
  const candidates = works.filter(
    (work): work is MusicWork & { u2bId: string } => Boolean(work.u2bId),
  );
  const cachedByVideoId = await readYouTubeThumbnailCacheEntries(
    candidates.map((work) => work.u2bId),
  );
  const now = new Date();

  const resolved = await mapWithConcurrency(candidates, 4, async (work) => {
    const cached = cachedByVideoId.get(work.u2bId);
    let thumbnailBlurDataUrl: string | null;
    if (cached?.status === "available") {
      thumbnailBlurDataUrl = cached.blurDataUrl;
    } else if (
      cached?.nextRetryAt &&
      cached.nextRetryAt > now &&
      (cached.status === "failed" || cached.status === "missing")
    ) {
      return null;
    } else if (cached?.status === "pending") {
      return null;
    } else {
      const thumbnail = await ensureYouTubeThumbnailCache(work.u2bId);
      if (!thumbnail.exists) return null;
      thumbnailBlurDataUrl = thumbnail.blurDataUrl;
    }

    const availabilityFresh =
      cached?.availabilityNextCheckAt && cached.availabilityNextCheckAt > now;
    if (availabilityFresh && cached.availabilityStatus === "public") {
      return { ...work, thumbnailBlurDataUrl };
    }
    if (
      availabilityFresh &&
      (cached.availabilityStatus === "unavailable" ||
        cached.availabilityStatus === "failed")
    ) {
      return null;
    }
    if (availabilityFresh && cached.availabilityStatus === "checking") {
      return null;
    }

    const publication = await checkYouTubeVideoPublished(work.u2bId);
    return publication.status === "published"
      ? { ...work, thumbnailBlurDataUrl }
      : null;
  });

  return resolved.flatMap((work) => (work ? [work] : []));
}

export async function loadMusicWorkWithContent(
  workPath: string,
): Promise<MusicWorkWithContent | null> {
  const work =
    (await listMusicWorks()).find(
      (item) => item.path === workPath || item.contentId === workPath,
    ) ?? null;

  if (!work?.u2bId) {
    return work as MusicWorkWithContent | null;
  }

  return {
    ...work,
    thumbnailBlurDataUrl: await readYouTubeThumbnailBlurDataUrl(work.u2bId),
  };
}

export async function getAvailableLanguages(
  workPath: string,
): Promise<string[]> {
  await loadMusicWorkWithContent(workPath);
  return [];
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapValue: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapValue(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}
