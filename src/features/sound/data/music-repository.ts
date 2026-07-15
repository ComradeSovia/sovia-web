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

const DATABASE_TIMEOUT_MS = 10_000;
const YOUTUBE_LOCALIZATION_FIELDS = [
  "title",
  "description",
] as const satisfies (keyof YoutubeLocalizationContent)[];

const MUSIC_WORK_INCLUDE = {
  content: true,
  platforms: true,
  source: true,
  status: true,
  subtitles: true,
} as const;

type MusicWorkSourceSection = {
  sourceType?: string | null;
  title?: string | null;
  artists?: unknown;
  sourceUrl?: string | null;
  ip?: string | null;
  series?: string | null;
  session?: string | null;
  details?: string | null;
};

type MusicWorkContentSection = {
  songTitle?: string | null;
  lyrics?: string | null;
  shortDescription?: string | null;
  introText?: string | null;
  productionNotes?: string | null;
  relatedWorkUids?: string | null;
};

type MusicWorkStatusSection = {
  visible?: boolean | null;
  publishedAt?: string | null;
};

type MusicWorkPlatformSection = {
  platform?: string | null;
  platformId?: string | null;
  title?: string | null;
  description?: string | null;
  metadata?: unknown;
};

type MusicWorkSubtitlesSection = {
  tracks?: unknown;
};

type MusicWorkRecordSource = {
  path?: string | null;
  contentId: string;
  storageSource?: "db" | "db+file" | "file";
  workType: string;
  content?: MusicWorkContentSection | null;
  platforms?: MusicWorkPlatformSection[] | null;
  source?: MusicWorkSourceSection | null;
  status?: MusicWorkStatusSection | null;
  subtitles?: MusicWorkSubtitlesSection | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
  const contentId = value.contentId;
  const content = value.content;
  const status = value.status;
  const platforms = value.platforms ?? [];
  const youtubePlatform = findPlatform(platforms, "youtube");
  const bilibiliPlatform = findPlatform(platforms, "bilibili");
  const vkPlatform = findPlatform(platforms, "vk");
  const pixivPlatform = findPlatform(platforms, "pixiv");
  const songTitle = content?.songTitle ?? null;
  const source = value.source;
  const subtitles = value.subtitles;
  const fromTitle = source?.title ?? null;
  const fromSeries = source?.series ?? null;
  const fromArtists = normalizeStringArray(source?.artists);

  return {
    path: value.path ?? "",
    contentId,
    storageSource: value.storageSource,
    workType: value.workType,
    visible: status?.visible ?? false,
    publishedAt: status?.publishedAt,
    songTitle,
    fromTitle,
    fromArtists,
    fromSource: source?.sourceUrl,
    fromType: source?.sourceType,
    fromIp: source?.ip,
    fromSeries,
    fromSession: source?.session,
    fromDetails: source?.details,
    vid: contentId,
    title: songTitle ?? contentId,
    original: fromTitle,
    u2bId: youtubePlatform?.platformId,
    series: fromSeries,
    bilibiliId: bilibiliPlatform?.platformId,
    bilibiliTitle: bilibiliPlatform?.title,
    bilibiliDescription: bilibiliPlatform?.description,
    inspiredByDetail: source?.sourceUrl,
    inspiredByAuthor: fromArtists?.join(", "),
    inspiredByTitle: fromTitle,
    introText: content?.introText,
    isOriginal: value.workType === "O" || value.workType === "CO",
    lyrics: content?.lyrics,
    musicStyle: value.workType,
    musicType: source?.sourceType,
    pixivId: pixivPlatform?.platformId,
    pixivTitle: pixivPlatform?.title,
    pixivDescription: pixivPlatform?.description,
    productionNotes: content?.productionNotes,
    relatedWorkUids: content?.relatedWorkUids,
    shortDescription: content?.shortDescription,
    subtitleTracks: normalizeSubtitleTracks(subtitles?.tracks),
    vkId: vkPlatform?.platformId,
    vkTitle: vkPlatform?.title,
    vkDescription: vkPlatform?.description,
    youtubeLocalization: normalizeYoutubeLocalization(
      youtubePlatform?.metadata,
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

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : null;
  }

  if (typeof value === "string") {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : null;
  }

  return null;
}

function findPlatform(platforms: MusicWorkPlatformSection[], platform: string) {
  return platforms.find((item) => item.platform === platform);
}

function toPlatformPayload({
  description,
  metadata,
  platformId,
  title,
}: {
  description?: string | null;
  metadata?: unknown;
  platformId?: string | null;
  title?: string | null;
}) {
  return {
    description: normalizeOptional(description),
    metadata: metadata ?? undefined,
    platformId: normalizeOptional(platformId),
    title: normalizeOptional(title),
  };
}

function toWorkWithContent(row: MusicWorkRecord): MusicWorkWithContent {
  const work = toWorkRecord(row);

  return {
    path: work.path,
    contentId: work.contentId,
    storageSource: work.storageSource,
    workType: work.workType,
    visible: work.visible,
    publishedAt: work.publishedAt,
    songTitle: work.songTitle,
    fromTitle: work.fromTitle,
    fromArtists: work.fromArtists,
    fromSource: work.fromSource,
    fromType: work.fromType,
    fromIp: work.fromIp,
    fromSeries: work.fromSeries,
    fromSession: work.fromSession,
    fromDetails: work.fromDetails,
    vid: work.vid,
    title: work.title,
    original: work.original,
    u2bId: work.u2bId,
    series: work.series,
    bilibiliId: work.bilibiliId,
    bilibiliTitle: work.bilibiliTitle,
    bilibiliDescription: work.bilibiliDescription,
    inspiredByDetail: work.inspiredByDetail,
    inspiredByAuthor: work.inspiredByAuthor,
    inspiredByTitle: work.inspiredByTitle,
    introText: work.introText,
    isOriginal: work.isOriginal,
    lyrics: work.lyrics,
    musicStyle: work.musicStyle,
    musicType: work.musicType,
    pixivId: work.pixivId,
    pixivTitle: work.pixivTitle,
    pixivDescription: work.pixivDescription,
    productionNotes: work.productionNotes,
    relatedWorkUids: work.relatedWorkUids,
    shortDescription: work.shortDescription,
    subtitleTracks: work.subtitleTracks,
    vkId: work.vkId,
    vkTitle: work.vkTitle,
    vkDescription: work.vkDescription,
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
  const contentId = work.contentId || work.vid || work.path;
  const songTitle = work.songTitle ?? work.title ?? null;
  const fromTitle = work.fromTitle ?? work.original ?? null;
  const fromSeries = work.fromSeries ?? work.series ?? null;

  return {
    path: work.path,
    contentId,
    storageSource: "file",
    workType: work.workType ?? (work.isOriginal ? "O" : "R"),
    songTitle,
    fromTitle,
    fromArtists: work.fromArtists ?? null,
    fromSource: work.fromSource ?? null,
    fromType: work.fromType ?? null,
    fromIp: work.fromIp ?? null,
    fromSeries,
    fromSession: work.fromSession ?? null,
    fromDetails: work.fromDetails ?? null,
    vid: contentId,
    title: songTitle ?? contentId,
    original: normalizeOptional(fromTitle),
    u2bId: normalizeOptional(work.u2bId),
    series: normalizeOptional(fromSeries),
    bilibiliId: null,
    bilibiliTitle: null,
    bilibiliDescription: null,
    inspiredByDetail: null,
    inspiredByAuthor: null,
    inspiredByTitle: normalizeOptional(fromTitle),
    introText: null,
    isOriginal: false,
    lyrics: readLegacyMarkdown(contentId, "lyrics.md"),
    musicStyle: null,
    musicType: null,
    pixivId: null,
    pixivTitle: null,
    pixivDescription: null,
    productionNotes: null,
    publishedAt: work.publishedAt ?? null,
    visible: work.visible ?? true,
    relatedWorkUids: null,
    shortDescription: null,
    subtitleTracks: null,
    vkId: null,
    vkTitle: null,
    vkDescription: null,
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

    return (
      await withDatabaseTimeout(
        prisma.musicWork.findMany({ include: MUSIC_WORK_INCLUDE }),
      )
    ).map((work) =>
      toWorkRecord({
        ...work,
        storageSource: "db",
      }),
    );
  } catch (error) {
    console.warn(getFriendlyDatabaseError(error));
    return [];
  }
}

export async function listMusicWorks() {
  const worksByContentId = new Map<string, MusicWorkRecord>();

  for (const work of readLegacyWorks()) {
    const record = toLegacyWorkRecord(work);
    worksByContentId.set(record.contentId, record);
  }

  for (const work of await listDatabaseMusicWorks()) {
    const hasFileRecord = worksByContentId.has(work.contentId);
    worksByContentId.set(work.contentId, {
      ...work,
      storageSource: hasFileRecord ? "db+file" : "db",
    });
  }

  return Array.from(worksByContentId.values()).sort((a, b) =>
    a.contentId.localeCompare(b.contentId, undefined, { numeric: true }),
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
        prisma.musicWork.findUnique({
          include: MUSIC_WORK_INCLUDE,
          where: { path: workPath },
        }),
      );
    }
  } catch (error) {
    console.warn(getFriendlyDatabaseError(error));
  }

  if (row) {
    const hasFileRecord = readLegacyWorks().some(
      (work) => (work.contentId || work.vid || work.path) === row.contentId,
    );

    return toWorkWithContent(
      toWorkRecord({
        ...row,
        storageSource: hasFileRecord ? "db+file" : "db",
      }),
    );
  }

  const legacyWork = readLegacyWorks().find((work) => work.path === workPath);
  if (!legacyWork) {
    return null;
  }

  return toMusicWorkWithContent(toLegacyWorkRecord(legacyWork));
}

export async function upsertMusicWork(
  work: MusicWorkDraft,
  currentContentId?: string,
) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  const contentId = work.contentId || work.vid || work.path;
  const source = {
    artists: work.fromArtists ?? [],
    details: normalizeOptional(work.fromDetails),
    ip: normalizeOptional(work.fromIp),
    series: normalizeOptional(work.fromSeries ?? work.series),
    session: normalizeOptional(work.fromSession),
    sourceType: normalizeOptional(work.fromType ?? work.musicType),
    sourceUrl: normalizeOptional(work.fromSource ?? work.inspiredByDetail),
    title: normalizeOptional(work.fromTitle ?? work.original),
  };
  const status = {
    publishedAt: normalizeOptional(work.publishedAt),
    visible: work.visible ?? false,
  };
  const content = {
    introText: work.introText ?? "",
    lyrics: work.lyrics ?? "",
    productionNotes: work.productionNotes ?? "",
    relatedWorkUids: normalizeOptional(work.relatedWorkUids),
    shortDescription: normalizeOptional(work.shortDescription),
    songTitle: normalizeOptional(work.songTitle ?? work.title),
  };
  const platforms = [
    {
      platform: "youtube",
      ...toPlatformPayload({
        metadata: work.youtubeLocalization ?? {},
        platformId: work.u2bId,
      }),
    },
    {
      platform: "bilibili",
      ...toPlatformPayload({
        description: work.bilibiliDescription,
        platformId: work.bilibiliId,
        title: work.bilibiliTitle,
      }),
    },
    {
      platform: "vk",
      ...toPlatformPayload({
        description: work.vkDescription,
        platformId: work.vkId,
        title: work.vkTitle,
      }),
    },
    {
      platform: "pixiv",
      ...toPlatformPayload({
        description: work.pixivDescription,
        platformId: work.pixivId,
        title: work.pixivTitle,
      }),
    },
  ];
  const subtitles = {
    tracks: work.subtitleTracks ?? {},
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (currentContentId && currentContentId !== contentId) {
        await tx.musicWork.deleteMany({
          where: { contentId: currentContentId },
        });
      }

      await tx.musicWork.upsert({
        where: { contentId },
        create: {
          contentId,
          path: normalizeOptional(work.path),
          workType: work.workType || "O",
        },
        update: {
          path: normalizeOptional(work.path),
          workType: work.workType || "O",
        },
      });

      await tx.musicWorkStatus.upsert({
        where: { contentId },
        create: {
          contentId,
          ...status,
        },
        update: status,
      });

      await tx.musicWorkContent.upsert({
        where: { contentId },
        create: {
          contentId,
          ...content,
        },
        update: content,
      });

      await tx.musicWorkSource.upsert({
        where: { contentId },
        create: {
          contentId,
          ...source,
        },
        update: source,
      });

      for (const platform of platforms) {
        await tx.musicWorkPlatform.upsert({
          where: {
            contentId_platform: {
              contentId,
              platform: platform.platform,
            },
          },
          create: {
            contentId,
            ...platform,
          },
          update: platform,
        });
      }

      await tx.musicWorkSubtitles.upsert({
        where: { contentId },
        create: {
          contentId,
          ...subtitles,
        },
        update: subtitles,
      });
    });
  } catch (error) {
    throw new Error(getFriendlyDatabaseError(error));
  }
}

export async function deleteMusicWorkByContentId(contentId: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  try {
    await prisma.musicWork.deleteMany({ where: { contentId } });
  } catch (error) {
    throw new Error(getFriendlyDatabaseError(error));
  }
}
