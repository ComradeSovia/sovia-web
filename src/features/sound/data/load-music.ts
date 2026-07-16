import {
  checkYouTubeVideoPublished,
  readYouTubeThumbnailBlurDataUrl,
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

  // Filter: only return works with YouTube ID and valid thumbnail
  const result: MusicWork[] = [];

  for (const work of works) {
    if (!work.u2bId) continue;

    const publication = await checkYouTubeVideoPublished(work.u2bId);
    if (publication.status !== "published") continue;

    result.push({
      ...work,
      thumbnailBlurDataUrl: await readYouTubeThumbnailBlurDataUrl(work.u2bId),
    });
  }

  return result;
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
