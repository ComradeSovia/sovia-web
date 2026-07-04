import fs from "node:fs";
import path from "node:path";
import { DATA_LIST_FILE, DATA_WORKS_DIR } from "@sovia/shared/config/data";
import { SITE_LOCALES } from "@sovia/shared/i18n/site-locale";
import type {
  MusicWork,
  MusicWorkDraft,
  MusicWorkRecord,
  MusicWorkSubtitleTracks,
  MusicWorkWithContent,
  MusicWorkYoutubeLocalization,
  YoutubeLocalizationContent,
} from "../model/music";
import { getFriendlyDatabaseError } from "./database-errors";
import { getPrismaClient } from "./prisma";

const DATABASE_TIMEOUT_MS = 2500;
const YOUTUBE_LOCALIZATION_FIELDS = [
  "title",
  "description",
] as const satisfies (keyof YoutubeLocalizationContent)[];

type MusicWorkRecordSource = Omit<
  MusicWorkRecord,
  "subtitleTracks" | "youtubeLocalization"
> & {
  subtitleTracks?: unknown;
  youtubeLocalization?: unknown;
};

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

function toWorkRecord(value: MusicWorkRecordSource): MusicWorkRecord {
  return {
    path: value.path,
    vid: value.vid,
    title: value.title,
    original: value.original,
    u2bId: value.u2bId,
    series: value.series,
    bilibiliId: value.bilibiliId,
    inspiredByDetail: value.inspiredByDetail,
    inspiredByAuthor: value.inspiredByAuthor,
    inspiredByTitle: value.inspiredByTitle,
    introText: value.introText,
    isOriginal: value.isOriginal,
    lyrics: value.lyrics,
    musicStyle: value.musicStyle,
    musicType: value.musicType,
    pixivId: value.pixivId,
    productionNotes: value.productionNotes,
    publishedAt: value.publishedAt,
    relatedWorkUids: value.relatedWorkUids,
    shortDescription: value.shortDescription,
    subtitleTracks: normalizeSubtitleTracks(value.subtitleTracks),
    vkId: value.vkId,
    youtubeLocalization: normalizeYoutubeLocalization(
      value.youtubeLocalization,
    ),
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeYoutubeLocalization(
  value: unknown,
): MusicWorkYoutubeLocalization {
  if (!isPlainRecord(value)) return {};

  const youtubeLocalization: MusicWorkYoutubeLocalization = {};

  for (const locale of SITE_LOCALES) {
    const source = value[locale];
    if (!isPlainRecord(source)) continue;

    const content: YoutubeLocalizationContent = {};

    for (const field of YOUTUBE_LOCALIZATION_FIELDS) {
      const fieldValue = source[field];
      if (typeof fieldValue === "string" && fieldValue.trim()) {
        content[field] = fieldValue;
      }
    }

    if (Object.keys(content).length > 0) {
      youtubeLocalization[locale] = content;
    }
  }

  return youtubeLocalization;
}

function normalizeSubtitleTracks(value: unknown): MusicWorkSubtitleTracks {
  if (!isPlainRecord(value)) return {};

  const subtitleTracks: MusicWorkSubtitleTracks = {};

  for (const locale of SITE_LOCALES) {
    const track = value[locale];
    if (typeof track === "string" && track.trim()) {
      subtitleTracks[locale] = track;
    }
  }

  return subtitleTracks;
}

function toWorkWithContent(row: MusicWorkRecord): MusicWorkWithContent {
  const work = toWorkRecord(row);

  return {
    path: work.path,
    vid: work.vid,
    title: work.title,
    original: work.original,
    u2bId: work.u2bId,
    series: work.series,
    bilibiliId: work.bilibiliId,
    inspiredByDetail: work.inspiredByDetail,
    inspiredByAuthor: work.inspiredByAuthor,
    inspiredByTitle: work.inspiredByTitle,
    introText: work.introText,
    isOriginal: work.isOriginal,
    lyrics: work.lyrics,
    musicStyle: work.musicStyle,
    musicType: work.musicType,
    pixivId: work.pixivId,
    productionNotes: work.productionNotes,
    publishedAt: work.publishedAt,
    relatedWorkUids: work.relatedWorkUids,
    shortDescription: work.shortDescription,
    subtitleTracks: work.subtitleTracks,
    vkId: work.vkId,
    youtubeLocalization: work.youtubeLocalization,
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
    bilibiliId: null,
    inspiredByDetail: null,
    inspiredByAuthor: null,
    inspiredByTitle: normalizeOptional(work.original),
    introText: null,
    isOriginal: false,
    lyrics: readLegacyMarkdown(work.vid, "lyrics.md"),
    musicStyle: null,
    musicType: null,
    pixivId: null,
    productionNotes: null,
    publishedAt: null,
    relatedWorkUids: null,
    shortDescription: null,
    subtitleTracks: null,
    vkId: null,
    youtubeLocalization: null,
  };
}

function toMusicWorkWithContent(work: MusicWorkRecord): MusicWorkWithContent {
  return toWorkWithContent(work);
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
  let row: MusicWorkRecordSource | null = null;

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
          bilibiliId: normalizeOptional(work.bilibiliId),
          inspiredByDetail: normalizeOptional(work.inspiredByDetail),
          inspiredByAuthor: normalizeOptional(work.inspiredByAuthor),
          inspiredByTitle: normalizeOptional(work.inspiredByTitle),
          introText: work.introText ?? "",
          isOriginal: Boolean(work.isOriginal),
          lyrics: work.lyrics ?? "",
          musicStyle: normalizeOptional(work.musicStyle),
          musicType: normalizeOptional(work.musicType),
          pixivId: normalizeOptional(work.pixivId),
          productionNotes: work.productionNotes ?? "",
          publishedAt: normalizeOptional(work.publishedAt),
          relatedWorkUids: normalizeOptional(work.relatedWorkUids),
          shortDescription: normalizeOptional(work.shortDescription),
          subtitleTracks: work.subtitleTracks ?? {},
          vkId: normalizeOptional(work.vkId),
          youtubeLocalization: work.youtubeLocalization ?? {},
        },
        update: {
          vid: work.vid || work.path,
          title: work.title,
          original: normalizeOptional(work.original),
          u2bId: normalizeOptional(work.u2bId),
          series: normalizeOptional(work.series),
          bilibiliId: normalizeOptional(work.bilibiliId),
          inspiredByDetail: normalizeOptional(work.inspiredByDetail),
          inspiredByAuthor: normalizeOptional(work.inspiredByAuthor),
          inspiredByTitle: normalizeOptional(work.inspiredByTitle),
          introText: work.introText ?? "",
          isOriginal: Boolean(work.isOriginal),
          lyrics: work.lyrics ?? "",
          musicStyle: normalizeOptional(work.musicStyle),
          musicType: normalizeOptional(work.musicType),
          pixivId: normalizeOptional(work.pixivId),
          productionNotes: work.productionNotes ?? "",
          publishedAt: normalizeOptional(work.publishedAt),
          relatedWorkUids: normalizeOptional(work.relatedWorkUids),
          shortDescription: normalizeOptional(work.shortDescription),
          subtitleTracks: work.subtitleTracks ?? {},
          vkId: normalizeOptional(work.vkId),
          youtubeLocalization: work.youtubeLocalization ?? {},
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
