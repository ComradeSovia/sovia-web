import fs from "node:fs";
import path from "node:path";
import { DATA_LIST_FILE, DATA_WORKS_DIR } from "@sovia/shared/config/data";
import type {
  MusicWork,
  MusicWorkDraft,
  MusicWorkRecord,
  MusicWorkWithContent,
} from "../model/music";
import { getFriendlyDatabaseError } from "./database-errors";
import { getPrismaClient } from "./prisma";

const DATABASE_TIMEOUT_MS = 2500;

async function withDatabaseTimeout<T>(operation: Promise<T>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("Database connection timeout"));
    }, DATABASE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function toWorkRecord(value: MusicWorkRecord): MusicWorkRecord {
  return {
    path: value.path,
    vid: value.vid,
    title: value.title,
    original: value.original,
    u2bId: value.u2bId,
    series: value.series,
    description: value.description,
    lyrics: value.lyrics,
    createdAt:
      value.createdAt instanceof Date
        ? value.createdAt.toISOString()
        : value.createdAt,
    updatedAt:
      value.updatedAt instanceof Date
        ? value.updatedAt.toISOString()
        : value.updatedAt,
  };
}

function toWorkWithContent(row: MusicWorkRecord): MusicWorkWithContent {
  const work = toWorkRecord(row);
  const descriptions: Record<string, string> = work.description
    ? { default: work.description }
    : {};
  const lyrics: Record<string, string> = work.lyrics
    ? { default: work.lyrics }
    : {};

  return {
    path: work.path,
    vid: work.vid,
    title: work.title,
    original: work.original,
    u2bId: work.u2bId,
    series: work.series,
    descriptions,
    lyrics,
    availableLanguages: Array.from(
      new Set([...Object.keys(descriptions), ...Object.keys(lyrics)]),
    ),
  };
}

function normalizeOptional(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readLegacyMarkdown(contentKey: string, fileName: string) {
  const contentPath = path.join(DATA_WORKS_DIR, contentKey, fileName);
  if (!fs.existsSync(contentPath)) return "";
  return fs.readFileSync(contentPath, "utf-8");
}

function readLegacyWorks() {
  if (!fs.existsSync(DATA_LIST_FILE)) return [];

  const content = fs.readFileSync(DATA_LIST_FILE, "utf-8");
  return JSON.parse(content) as MusicWork[];
}

function toLegacyWorkRecord(work: MusicWork): MusicWorkRecord {
  return {
    path: work.path,
    vid: work.vid || work.path,
    title: work.title,
    original: normalizeOptional(work.original),
    u2bId: normalizeOptional(work.u2bId),
    series: normalizeOptional(work.series),
    description: readLegacyMarkdown(work.vid, "info.md"),
    lyrics: readLegacyMarkdown(work.vid, "lyrics.md"),
  };
}

function toMusicWorkWithContent(work: MusicWorkRecord): MusicWorkWithContent {
  const descriptions: Record<string, string> = work.description
    ? { default: work.description }
    : {};
  const lyrics: Record<string, string> = work.lyrics
    ? { default: work.lyrics }
    : {};

  return {
    path: work.path,
    vid: work.vid,
    title: work.title,
    original: work.original,
    u2bId: work.u2bId,
    series: work.series,
    descriptions,
    lyrics,
    availableLanguages: Array.from(
      new Set([...Object.keys(descriptions), ...Object.keys(lyrics)]),
    ),
  };
}

export function ensureMusicDatabase() {
  if (!getPrismaClient()) {
    throw new Error(getFriendlyDatabaseError(null));
  }
}

export async function checkMusicDatabaseConnection() {
  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return {
        ok: false,
        message: getFriendlyDatabaseError(null),
      };
    }

    await withDatabaseTimeout(prisma.musicWork.count());
    return {
      ok: true,
      message: "PostgreSQL connection is ready.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getFriendlyDatabaseError(error),
    };
  }
}

export async function countMusicWorks() {
  const prisma = getPrismaClient();
  if (!prisma) return 0;

  return prisma.musicWork.count();
}

async function listDatabaseMusicWorks() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return [];

    return (await withDatabaseTimeout(prisma.musicWork.findMany())).map(
      toWorkRecord,
    );
  } catch (error) {
    console.warn(getFriendlyDatabaseError(error));
    return [];
  }
}

export async function listMusicWorks() {
  const worksByPath = new Map<string, MusicWorkRecord>();

  for (const work of readLegacyWorks()) {
    worksByPath.set(work.path, toLegacyWorkRecord(work));
  }

  for (const work of await listDatabaseMusicWorks()) {
    worksByPath.set(work.path, work);
  }

  return Array.from(worksByPath.values()).sort((a, b) =>
    a.vid.localeCompare(b.vid, undefined, { numeric: true }),
  );
}

export async function listMusicWorksWithContent() {
  return listMusicWorks();
}

export async function getMusicWorkByPath(workPath: string) {
  let row: MusicWorkRecord | null = null;

  try {
    const prisma = getPrismaClient();

    if (prisma) {
      row = await withDatabaseTimeout(
        prisma.musicWork.findUnique({ where: { path: workPath } }),
      );
    }
  } catch (error) {
    console.warn(getFriendlyDatabaseError(error));
  }

  if (row) {
    return toWorkWithContent(toWorkRecord(row));
  }

  const legacyWork = readLegacyWorks().find((work) => work.path === workPath);
  if (!legacyWork) {
    return null;
  }

  return toMusicWorkWithContent(toLegacyWorkRecord(legacyWork));
}

export async function upsertMusicWork(
  work: MusicWorkDraft,
  currentPath?: string,
) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (currentPath && currentPath !== work.path) {
        await tx.musicWork.deleteMany({ where: { path: currentPath } });
      }

      await tx.musicWork.upsert({
        where: { path: work.path },
        create: {
          path: work.path,
          vid: work.vid || work.path,
          title: work.title,
          original: normalizeOptional(work.original),
          u2bId: normalizeOptional(work.u2bId),
          series: normalizeOptional(work.series),
          description: work.description ?? "",
          lyrics: work.lyrics ?? "",
        },
        update: {
          vid: work.vid || work.path,
          title: work.title,
          original: normalizeOptional(work.original),
          u2bId: normalizeOptional(work.u2bId),
          series: normalizeOptional(work.series),
          description: work.description ?? "",
          lyrics: work.lyrics ?? "",
        },
      });
    });
  } catch (error) {
    throw new Error(getFriendlyDatabaseError(error));
  }
}

export async function deleteMusicWorkByPath(workPath: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  try {
    await prisma.musicWork.deleteMany({ where: { path: workPath } });
  } catch (error) {
    throw new Error(getFriendlyDatabaseError(error));
  }
}
