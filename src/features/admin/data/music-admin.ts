import {
  checkMusicDatabaseConnection,
  clearMusicWorkStepData,
  deleteMusicWorkByContentId,
  ensureMusicDatabase,
  getMusicWorkByPath,
  listMusicWorksWithContent,
  upsertMusicWork,
} from "@sovia/sound/data/music-repository";
import type { MusicWorkDraft } from "@sovia/sound/model/music";

export function initializeMusicDatabase() {
  ensureMusicDatabase();
}

export async function listAdminMusicWorks() {
  return listMusicWorksWithContent();
}

export async function getAdminMusicWork(id: string) {
  const listedWork =
    (await listMusicWorksWithContent()).find(
      (item) => item.contentId === id || item.path === id,
    ) ?? null;
  if (listedWork) return listedWork;

  const work = await getMusicWorkByPath(id);
  if (work) return work;

  return null;
}

export async function getAdminDatabaseStatus() {
  return checkMusicDatabaseConnection();
}

export async function saveMusicWork({
  currentContentId,
  work,
}: {
  currentContentId?: string;
  work: MusicWorkDraft;
}) {
  initializeMusicDatabase();
  await upsertMusicWork(work, currentContentId);
}

export async function deleteMusicWork(contentId: string) {
  initializeMusicDatabase();
  await deleteMusicWorkByContentId(contentId);
}

export async function clearMusicWorkStep(contentId: string, step: string) {
  initializeMusicDatabase();
  await clearMusicWorkStepData(contentId, step);
}
