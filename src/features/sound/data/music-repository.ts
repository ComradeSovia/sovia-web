import type {
  MusicWorkDraft,
  MusicWorkRecord,
  MusicWorkSubtitleTracks,
  MusicWorkWithContent,
  MusicWorkYoutubeAdminMetadata,
  MusicWorkYoutubeLocalization,
  MusicWorkYoutubePlatformMetadata,
  YoutubeLocalizationContent,
} from "../model/music";
import { getFriendlyDatabaseError } from "./database-errors";
import { getPrismaClient } from "./prisma";

const YOUTUBE_LOCALIZATION_FIELDS = [
  "title",
  "description",
] as const satisfies (keyof YoutubeLocalizationContent)[];
const YOUTUBE_ADMIN_METADATA_KEY = "__admin";

const MUSIC_WORK_INCLUDE = {
  content: true,
  platforms: true,
  source: true,
  status: true,
  subtitles: true,
} as const;

const MUSIC_WORK_LIST_INCLUDE = {
  content: true,
  platforms: true,
  source: true,
  status: true,
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
  contentType?: string | null;
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
    contentType: value.contentType ?? "Music",
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
    pixivTags: normalizePixivTags(pixivPlatform?.metadata),
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
    youtubePrimaryLocale: normalizeYoutubeAdminLocale(
      youtubePlatform?.metadata,
      "youtubePrimaryLocale",
    ),
    subtitlePrimaryLocale: normalizeYoutubeAdminLocale(
      youtubePlatform?.metadata,
      "subtitlePrimaryLocale",
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

  for (const [locale, source] of Object.entries(value)) {
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

function normalizeYoutubeAdminLocale(
  value: unknown,
  key: keyof MusicWorkYoutubeAdminMetadata,
) {
  if (!isPlainRecord(value)) return null;
  const admin = value[YOUTUBE_ADMIN_METADATA_KEY];
  if (!isPlainRecord(admin)) return null;

  const locale = admin[key];
  return typeof locale === "string" && locale.trim() ? locale : null;
}

function normalizeSubtitleTracks(value: unknown): MusicWorkSubtitleTracks {
  if (!isPlainRecord(value)) return {};

  const subtitleTracks: MusicWorkSubtitleTracks = {};

  for (const [locale, track] of Object.entries(value)) {
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

function normalizePixivTags(value: unknown) {
  if (!isPlainRecord(value)) return null;

  const tags = value.tags;
  const items = Array.isArray(tags)
    ? tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : typeof tags === "string"
      ? parseTagString(tags)
      : [];

  return items.length ? items.join(", ") : null;
}

function parseTagString(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,\n\r]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toPixivMetadata(tags: string | null | undefined) {
  const items = parseTagString(tags);
  return items.length ? { tags: items } : {};
}

function toYoutubeMetadata(
  localization: MusicWorkYoutubeLocalization | null | undefined,
  youtubePrimaryLocale: string | null | undefined,
  subtitlePrimaryLocale: string | null | undefined,
) {
  const metadata: MusicWorkYoutubePlatformMetadata = {
    ...(localization ?? {}),
  };
  const admin = withoutEmptyValues({
    subtitlePrimaryLocale: normalizeOptional(subtitlePrimaryLocale),
    youtubePrimaryLocale: normalizeOptional(youtubePrimaryLocale),
  }) satisfies MusicWorkYoutubeAdminMetadata;

  if (Object.keys(admin).length > 0) {
    metadata[YOUTUBE_ADMIN_METADATA_KEY] = admin;
  }

  return metadata;
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

function withoutUndefinedValues<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

function withoutEmptyValues<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== null && item !== undefined && item !== "",
    ),
  ) as Partial<T>;
}

function toWorkWithContent(work: MusicWorkRecord): MusicWorkWithContent {
  return {
    path: work.path,
    contentId: work.contentId,
    contentType: work.contentType,
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
    pixivTags: work.pixivTags,
    productionNotes: work.productionNotes,
    relatedWorkUids: work.relatedWorkUids,
    shortDescription: work.shortDescription,
    subtitleTracks: work.subtitleTracks,
    vkId: work.vkId,
    vkTitle: work.vkTitle,
    vkDescription: work.vkDescription,
    youtubeLocalization: work.youtubeLocalization,
    youtubePrimaryLocale: work.youtubePrimaryLocale,
    subtitlePrimaryLocale: work.subtitlePrimaryLocale,
  };
}

function normalizeOptional(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

    await prisma.musicWork.count();
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
  const prisma = getPrismaClient();
  if (!prisma) return [];

  return (
    await prisma.musicWork.findMany({
      include: MUSIC_WORK_LIST_INCLUDE,
      where: { contentType: "Music" },
    })
  ).map((work) =>
    toWorkRecord({
      ...work,
      storageSource: "db",
    }),
  );
}

export async function listMusicWorks() {
  return (await listDatabaseMusicWorks()).sort((a, b) =>
    a.contentId.localeCompare(b.contentId, undefined, { numeric: true }),
  );
}

export async function listMusicWorksWithContent() {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  return (await prisma.musicWork.findMany({ include: MUSIC_WORK_INCLUDE }))
    .map((work) =>
      toWorkRecord({
        ...work,
        storageSource: "db",
      }),
    )
    .sort((a, b) =>
      a.contentId.localeCompare(b.contentId, undefined, { numeric: true }),
    );
}

export async function listMusicWorkOptions() {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  return prisma.musicWork
    .findMany({
      select: {
        content: { select: { songTitle: true } },
        contentId: true,
        path: true,
      },
    })
    .then((works) =>
      works.map((work) => ({
        contentId: work.contentId,
        path: work.path,
        title: work.content?.songTitle ?? null,
      })),
    );
}

export async function getMusicWorkByPath(workPath: string) {
  let row: MusicWorkRecordSource | null = null;

  const prisma = getPrismaClient();

  if (prisma) {
    row = await prisma.musicWork.findFirst({
      include: MUSIC_WORK_INCLUDE,
      where: {
        OR: [{ path: workPath }, { contentId: workPath }],
      },
    });
  }

  if (row) {
    return toWorkWithContent(
      toWorkRecord({
        ...row,
        storageSource: "db",
      }),
    );
  }

  return null;
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
        metadata: toYoutubeMetadata(
          work.youtubeLocalization,
          work.youtubePrimaryLocale,
          work.subtitlePrimaryLocale,
        ),
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
        metadata: toPixivMetadata(work.pixivTags),
        platformId: work.pixivId,
        title: work.pixivTitle,
      }),
    },
  ];
  const subtitles = {
    tracks: work.subtitleTracks ?? {},
  };
  const contentUpdate = withoutEmptyValues(content);
  const sourceUpdate = withoutEmptyValues(source);
  const platformUpserts = platforms.map((platform) => ({
    create: platform,
    update: withoutUndefinedValues(platform),
    where: {
      contentId_platform: {
        contentId,
        platform: platform.platform,
      },
    },
  }));

  try {
    const upsert = prisma.musicWork.upsert({
      where: { contentId },
      create: {
        content: { create: content },
        contentId,
        contentType: work.contentType || "Music",
        path: normalizeOptional(work.path),
        platforms: { create: platforms },
        source: { create: source },
        status: { create: status },
        subtitles: { create: subtitles },
        workType: work.workType || "O",
      },
      update: {
        content: {
          upsert: {
            create: content,
            update: contentUpdate,
          },
        },
        path: normalizeOptional(work.path),
        contentType: work.contentType || "Music",
        platforms: { upsert: platformUpserts },
        source: {
          upsert: {
            create: source,
            update: sourceUpdate,
          },
        },
        status: {
          upsert: {
            create: status,
            update: status,
          },
        },
        subtitles: {
          upsert: {
            create: subtitles,
            update: subtitles,
          },
        },
        workType: work.workType || "O",
      },
    });

    if (currentContentId && currentContentId !== contentId) {
      await prisma.$transaction([
        prisma.musicWork.deleteMany({
          where: { contentId: currentContentId },
        }),
        upsert,
      ]);
    } else {
      await upsert;
    }
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
    await prisma.$transaction([
      prisma.adminMusicTodo.updateMany({
        data: { completedAt: null, contentId: null, status: "PROPOSED" },
        where: { contentId },
      }),
      prisma.musicWork.deleteMany({ where: { contentId } }),
    ]);
  } catch (error) {
    throw new Error(getFriendlyDatabaseError(error));
  }
}

export async function clearMusicWorkStepData(contentId: string, step: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error(getFriendlyDatabaseError(null));
  }

  try {
    switch (step) {
      case "metadata":
        await prisma.$transaction([
          prisma.musicWork.updateMany({
            data: { path: null },
            where: { contentId },
          }),
          prisma.musicWorkContent.updateMany({
            data: { songTitle: null },
            where: { contentId },
          }),
        ]);
        break;
      case "status":
        await prisma.musicWorkStatus.updateMany({
          data: { publishedAt: null, visible: false },
          where: { contentId },
        });
        break;
      case "from":
        await prisma.musicWorkSource.deleteMany({ where: { contentId } });
        break;
      case "description":
        await prisma.musicWorkContent.updateMany({
          data: {
            introText: "",
            productionNotes: "",
            shortDescription: null,
          },
          where: { contentId },
        });
        break;
      case "lyrics":
        await prisma.musicWorkContent.updateMany({
          data: { lyrics: "" },
          where: { contentId },
        });
        break;
      case "related":
        await prisma.musicWorkContent.updateMany({
          data: { relatedWorkUids: null },
          where: { contentId },
        });
        break;
      case "youtube":
      case "bilibili":
      case "vk":
      case "pixiv":
        await prisma.musicWorkPlatform.deleteMany({
          where: { contentId, platform: step },
        });
        break;
      case "subtitles":
        await prisma.musicWorkSubtitles.deleteMany({ where: { contentId } });
        break;
      default:
        throw new Error("This step cannot be cleared.");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "This step cannot be cleared."
    ) {
      throw error;
    }
    throw new Error(getFriendlyDatabaseError(error));
  }
}
