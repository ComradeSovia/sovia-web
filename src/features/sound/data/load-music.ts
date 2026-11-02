import { cache } from "react";
import {
  readYouTubeThumbnailBlurDataUrl,
  readYouTubeThumbnailCacheEntries,
} from "@sovia/youtube-api";
import type { MusicWork, MusicWorkWithContent } from "../model/music";
import { getMusicWorkByPath, listMusicWorks } from "./music-repository";

export async function loadMusicIndex(): Promise<MusicWork[]> {
  return listMusicWorks(true);
}

export async function loadAllMusicWorks(): Promise<MusicWork[]> {
  const candidates = (await listMusicWorks(true)).filter((work) =>
    Boolean(work.u2bId),
  );
  const cached = await readYouTubeThumbnailCacheEntries(
    candidates.map((work) => work.u2bId as string),
  );
  // Temporary probe failures do not unpublish editorially visible content.
  return candidates
    .filter(
      (work) =>
        cached.get(work.u2bId as string)?.availabilityStatus !== "unavailable",
    )
    .map((work) => ({
      ...work,
      lyrics: undefined,
      subtitleTracks: undefined,
      thumbnailBlurDataUrl:
        cached.get(work.u2bId as string)?.blurDataUrl ?? null,
    }));
}

export const loadMusicWorkWithContent = cache(
  async (workPath: string): Promise<MusicWorkWithContent | null> => {
    const work = await getMusicWorkByPath(workPath, true);
    if (!work?.u2bId) return null;
    return {
      ...work,
      thumbnailBlurDataUrl: await readYouTubeThumbnailBlurDataUrl(work.u2bId),
    };
  },
);

export async function getAvailableLanguages(
  workPath: string,
): Promise<string[]> {
  const work = await loadMusicWorkWithContent(workPath);
  return Object.keys(work?.youtubeLocalization ?? {});
}
