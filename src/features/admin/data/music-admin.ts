import {
  checkMusicDatabaseConnection,
  deleteMusicWorkByPath,
  ensureMusicDatabase,
  listMusicWorksWithContent,
  upsertMusicWork,
} from "@sovia/sound/data/music-repository";
import type { MusicWorkDraft } from "@sovia/sound/model/music";

export function initializeMusicDatabase() {
  ensureMusicDatabase();
}

export async function listAdminMusicWorks() {
  initializeMusicDatabase();
  return listMusicWorksWithContent();
}

export async function getAdminDatabaseStatus() {
  return checkMusicDatabaseConnection();
}

export async function saveMusicWork({
  currentPath,
  work,
}: {
  currentPath?: string;
  work: MusicWorkDraft;
}) {
  initializeMusicDatabase();
  await upsertMusicWork(work, currentPath);
}

export async function deleteMusicWork(path: string) {
  initializeMusicDatabase();
  await deleteMusicWorkByPath(path);
}
