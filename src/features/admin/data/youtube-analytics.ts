import { getPrismaClient } from "@sovia/sound/data/prisma";
import { getYouTubeAccessToken } from "@sovia/youtube-api";
import { listAdminMusicWorks } from "./music-admin";
import { getAdminYoutubeCredentials } from "./youtube-connection";

type AnalyticsValue = number | string | null;

type AnalyticsResponse = {
  columnHeaders?: { name: string }[];
  error?: { error_description?: string; message?: string };
  rows?: AnalyticsValue[][];
};

type YouTubeVideoListResponse = {
  error?: { error_description?: string; message?: string };
  items?: {
    id?: string;
    statistics?: {
      commentCount?: string;
      likeCount?: string;
      viewCount?: string;
    };
  }[];
};

type VideoMetricRow = {
  averageViewDuration?: number;
  averageViewPercentage?: number;
  comments: number;
  estimatedMinutesWatched?: number;
  likes: number;
  shares: number;
  subscribersGained: number;
  videoId: string;
  views: number;
};

type VideoPublicStats = {
  comments: number;
  likes: number;
  videoId: string;
  views: number;
};

const ANALYTICS_API_URL = "https://youtubeanalytics.googleapis.com/v2/reports";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const SYNC_ID = "primary";
const LIFETIME_PERIOD_DAYS = 0;
const LIFETIME_START_DATE = "2005-01-01";
const PERIOD_DAYS = [LIFETIME_PERIOD_DAYS, 7, 28, 90] as const;
const CORE_METRICS = [
  "views",
  "estimatedMinutesWatched",
  "averageViewDuration",
  "averageViewPercentage",
  "subscribersGained",
  "likes",
  "comments",
  "shares",
].join(",");

export type AdminYoutubeAnalyticsSnapshot = Awaited<
  ReturnType<typeof listLatestYoutubeAnalyticsSnapshots>
>[number];

export async function listLatestYoutubeAnalyticsSnapshots(
  periodDays = LIFETIME_PERIOD_DAYS,
) {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  const latest = await prisma.adminYoutubeVideoAnalyticsSnapshot.findFirst({
    orderBy: { syncedAt: "desc" },
    select: { endDate: true },
    where: { periodDays },
  });
  if (!latest) return [];

  return prisma.adminYoutubeVideoAnalyticsSnapshot.findMany({
    orderBy: [{ views: "desc" }, { contentId: "asc" }],
    where: { endDate: latest.endDate, periodDays },
  });
}

export async function getYoutubeAnalyticsSyncStatus() {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  return prisma.adminYoutubeAnalyticsSync.findUnique({
    where: { id: SYNC_ID },
  });
}

export async function syncAdminYoutubeAnalytics() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");

  const credentials = await getAdminYoutubeCredentials();
  const accessToken = await getYouTubeAccessToken(credentials);
  const works = (await listAdminMusicWorks()).filter((work) => work.u2bId);
  const endDate = getAnalyticsEndDate();
  const startDate = shiftDate(endDate, -89);

  await prisma.adminYoutubeAnalyticsSync.upsert({
    create: {
      id: SYNC_ID,
      startDate,
      endDate,
      status: "running",
      videoCount: works.length,
    },
    update: {
      message: null,
      startedAt: new Date(),
      startDate,
      endDate,
      status: "running",
      syncedAt: null,
      videoCount: works.length,
    },
    where: { id: SYNC_ID },
  });

  if (!works.length) {
    await prisma.adminYoutubeAnalyticsSync.update({
      data: {
        message: "No content records have a YouTube ID.",
        status: "success",
        syncedAt: new Date(),
      },
      where: { id: SYNC_ID },
    });
    return { message: "No YouTube videos to sync.", synced: 0 };
  }

  try {
    const videoIds = works
      .map((work) => work.u2bId)
      .filter((id): id is string => Boolean(id));
    const publicStats = await queryYouTubeVideoPublicStats({
      accessToken,
      videoIds,
    });
    const warnings = new Set<string>();
    let lifetimeAnalyticsRows = 0;

    for (const periodDays of PERIOD_DAYS) {
      const periodStartDate =
        periodDays === LIFETIME_PERIOD_DAYS
          ? LIFETIME_START_DATE
          : shiftDate(endDate, -(periodDays - 1));
      const coreRows = await queryVideoMetrics({
        accessToken,
        endDate,
        metrics: CORE_METRICS,
        startDate: periodStartDate,
        videoIds,
      }).catch((error) => {
        warnings.add(
          error instanceof Error
            ? `Analytics metrics skipped: ${error.message}`
            : "Analytics metrics skipped.",
        );
        return new Map<string, VideoMetricRow>();
      });
      if (periodDays === LIFETIME_PERIOD_DAYS) {
        lifetimeAnalyticsRows = coreRows.size;
      }

      for (const work of works) {
        if (!work.u2bId) continue;
        const core = coreRows.get(work.u2bId);
        const stats =
          periodDays === LIFETIME_PERIOD_DAYS
            ? publicStats.get(work.u2bId)
            : undefined;
        await prisma.adminYoutubeVideoAnalyticsSnapshot.upsert({
          create: {
            contentId: work.contentId,
            videoId: work.u2bId,
            periodDays,
            startDate: periodStartDate,
            endDate,
            ...getSnapshotData(core, stats),
          },
          update: {
            startDate: periodStartDate,
            syncedAt: new Date(),
            ...getSnapshotData(core, stats),
          },
          where: {
            videoId_periodDays_endDate: {
              endDate,
              periodDays,
              videoId: work.u2bId,
            },
          },
        });
      }
    }
    if (lifetimeAnalyticsRows === 0) {
      warnings.add(
        "Lifetime Analytics returned no rows; synced Data API totals only.",
      );
    }

    await prisma.adminYoutubeAnalyticsSync.update({
      data: {
        message: getSyncMessage(
          warnings,
          publicStats.size,
          lifetimeAnalyticsRows,
        ),
        status: "success",
        syncedAt: new Date(),
      },
      where: { id: SYNC_ID },
    });

    return {
      message: getSyncMessage(
        warnings,
        publicStats.size,
        lifetimeAnalyticsRows,
      ),
      synced: works.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YouTube Analytics sync failed.";
    await prisma.adminYoutubeAnalyticsSync.update({
      data: { message, status: "error", syncedAt: new Date() },
      where: { id: SYNC_ID },
    });
    throw new Error(message);
  }
}

async function queryYouTubeVideoPublicStats({
  accessToken,
  videoIds,
}: {
  accessToken: string;
  videoIds: string[];
}) {
  const rows = new Map<string, VideoPublicStats>();

  for (const chunk of chunkItems(videoIds, 50)) {
    const params = new URLSearchParams({
      fields: "items(id,statistics(viewCount,likeCount,commentCount))",
      id: chunk.join(","),
      part: "statistics",
    });
    const response = await fetch(`${YOUTUBE_API_URL}/videos?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "GET",
    });
    const payload = (await response
      .json()
      .catch(() => null)) as YouTubeVideoListResponse | null;

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          payload?.error?.error_description ||
          "YouTube video statistics could not be loaded.",
      );
    }

    for (const item of payload?.items ?? []) {
      if (!item.id) continue;
      rows.set(item.id, {
        comments: toInteger(item.statistics?.commentCount),
        likes: toInteger(item.statistics?.likeCount),
        videoId: item.id,
        views: toInteger(item.statistics?.viewCount),
      });
    }
  }

  return rows;
}

async function queryVideoMetrics({
  accessToken,
  endDate,
  metrics,
  startDate,
  videoIds,
}: {
  accessToken: string;
  endDate: string;
  metrics: string;
  startDate: string;
  videoIds: string[];
}) {
  const params = new URLSearchParams({
    dimensions: "video",
    endDate,
    filters: `video==${videoIds.join(",")}`,
    ids: "channel==MINE",
    maxResults: "500",
    metrics,
    sort: "-views",
    startDate,
  });
  const response = await fetch(`${ANALYTICS_API_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "GET",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as AnalyticsResponse | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.error?.error_description ||
        "YouTube Analytics report could not be loaded.",
    );
  }

  return parseVideoMetricRows(payload);
}

function parseVideoMetricRows(payload: AnalyticsResponse | null) {
  const headers = payload?.columnHeaders?.map((header) => header.name) ?? [];
  const rows = new Map<string, VideoMetricRow>();

  for (const row of payload?.rows ?? []) {
    const record = Object.fromEntries(
      headers.map((header, index) => [header, row[index]]),
    );
    const videoId = typeof record.video === "string" ? record.video : null;
    if (!videoId) continue;

    rows.set(videoId, {
      averageViewDuration: toOptionalNumber(record.averageViewDuration),
      averageViewPercentage: toOptionalNumber(record.averageViewPercentage),
      comments: toInteger(record.comments),
      estimatedMinutesWatched: toOptionalNumber(record.estimatedMinutesWatched),
      likes: toInteger(record.likes),
      shares: toInteger(record.shares),
      subscribersGained: toInteger(record.subscribersGained),
      videoId,
      views: toInteger(record.views),
    });
  }

  return rows;
}

function getSnapshotData(
  core: VideoMetricRow | undefined,
  stats: VideoPublicStats | undefined,
) {
  return {
    averageViewDuration: core?.averageViewDuration,
    averageViewPercentage: core?.averageViewPercentage,
    comments: stats?.comments ?? core?.comments ?? 0,
    estimatedMinutesWatched: core?.estimatedMinutesWatched,
    impressionClickThroughRate: null,
    impressions: null,
    likes: stats?.likes ?? core?.likes ?? 0,
    shares: core?.shares ?? 0,
    subscribersGained: core?.subscribersGained ?? 0,
    views: stats?.views ?? core?.views ?? 0,
  };
}

function getSyncMessage(
  warnings: Set<string>,
  publicStatsCount: number,
  lifetimeAnalyticsRows: number,
) {
  const base = `Synced quota-conscious YouTube stats for ${publicStatsCount} videos: Data API totals plus ${lifetimeAnalyticsRows} lifetime Analytics depth row(s).`;
  const warning = Array.from(warnings)[0];
  return warning ? `${base} ${warning}` : base;
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getAnalyticsEndDate() {
  return shiftDate(new Date().toISOString().slice(0, 10), -1);
}

function shiftDate(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toInteger(value: AnalyticsValue | undefined) {
  return Math.trunc(toNumber(value));
}

function toNumber(value: AnalyticsValue | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toOptionalNumber(value: AnalyticsValue | undefined) {
  if (value === undefined || value === null || value === "") return undefined;
  return toNumber(value);
}
