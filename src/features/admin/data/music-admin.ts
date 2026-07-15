import {
  checkMusicDatabaseConnection,
  deleteMusicWorkByContentId,
  ensureMusicDatabase,
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
