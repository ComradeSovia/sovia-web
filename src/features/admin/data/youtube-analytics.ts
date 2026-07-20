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

type VideoTrafficSourceRow = {
  engagedViews: number;
  estimatedMinutesWatched?: number;
  sourceType: string;
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
const EARLY_PERFORMANCE_WINDOWS_HOURS = [24, 72, 168] as const;
const EARLY_PERFORMANCE_SYNC_LIMIT = 50;
const EARLY_PERFORMANCE_GRANULARITY = "calendar_day";
const TRAFFIC_SOURCE_PERIOD_DAYS = 90;
const TRAFFIC_SOURCE_METRICS = [
  "views",
  "estimatedMinutesWatched",
  "engagedViews",
].join(",");
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

export async function listLatestYoutubeEarlyPerformanceSnapshots(
  contentId?: string,
) {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  return prisma.adminYoutubeVideoEarlyPerformanceSnapshot.findMany({
    orderBy: [{ contentId: "asc" }, { elapsedHours: "asc" }],
    where: contentId ? { contentId } : undefined,
  });
}

export async function listLatestYoutubeTrafficSourceSnapshots(
  contentId?: string,
  periodDays = TRAFFIC_SOURCE_PERIOD_DAYS,
) {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  const latest = await prisma.adminYoutubeVideoTrafficSourceSnapshot.findFirst({
    orderBy: { syncedAt: "desc" },
    select: { endDate: true },
    where: { periodDays, ...(contentId ? { contentId } : {}) },
  });
  if (!latest) return [];

  return prisma.adminYoutubeVideoTrafficSourceSnapshot.findMany({
    orderBy: [{ views: "desc" }, { sourceType: "asc" }],
    where: {
      endDate: latest.endDate,
      periodDays,
      ...(contentId ? { contentId } : {}),
    },
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
    const earlyPerformanceRows = await syncEarlyPerformanceSnapshots({
      accessToken,
      endDate,
      works,
    }).catch((error) => {
      warnings.add(
        error instanceof Error
          ? `Early performance sync skipped: ${error.message}`
          : "Early performance sync skipped.",
      );
      return 0;
    });
    const trafficSourceRows = await syncTrafficSourceSnapshots({
      accessToken,
      endDate,
      works,
    }).catch((error) => {
      warnings.add(
        error instanceof Error
          ? `Traffic source sync skipped: ${error.message}`
          : "Traffic source sync skipped.",
      );
      return 0;
    });
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
          earlyPerformanceRows,
          trafficSourceRows,
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
        earlyPerformanceRows,
        trafficSourceRows,
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

async function syncEarlyPerformanceSnapshots({
  accessToken,
  endDate,
  works,
}: {
  accessToken: string;
  endDate: string;
  works: Awaited<ReturnType<typeof listAdminMusicWorks>>;
}) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");

  const publishedWorks = works
    .filter((work) => work.u2bId && getDateOnly(work.publishedAt))
    .sort(
      (a, b) =>
        Date.parse(`${getDateOnly(b.publishedAt)}T00:00:00.000Z`) -
        Date.parse(`${getDateOnly(a.publishedAt)}T00:00:00.000Z`),
    )
    .slice(0, EARLY_PERFORMANCE_SYNC_LIMIT);
  let syncedRows = 0;

  for (const work of publishedWorks) {
    if (!work.u2bId) continue;
    const publishedDate = getDateOnly(work.publishedAt);
    if (!publishedDate) continue;

    for (const elapsedHours of EARLY_PERFORMANCE_WINDOWS_HOURS) {
      const elapsedDays = elapsedHours / 24;
      const windowEndDate = minDate(
        shiftDate(publishedDate, elapsedDays - 1),
        endDate,
      );
      if (windowEndDate < publishedDate) continue;

      const rows = await queryVideoMetrics({
        accessToken,
        endDate: windowEndDate,
        metrics: CORE_METRICS,
        startDate: publishedDate,
        videoIds: [work.u2bId],
      });
      const core = rows.get(work.u2bId);
      if (!core) continue;

      await prisma.adminYoutubeVideoEarlyPerformanceSnapshot.upsert({
        create: {
          contentId: work.contentId,
          elapsedHours,
          endDate: windowEndDate,
          granularity: EARLY_PERFORMANCE_GRANULARITY,
          startDate: publishedDate,
          videoId: work.u2bId,
          ...getEarlyPerformanceData(core),
        },
        update: {
          endDate: windowEndDate,
          granularity: EARLY_PERFORMANCE_GRANULARITY,
          startDate: publishedDate,
          syncedAt: new Date(),
          ...getEarlyPerformanceData(core),
        },
        where: {
          videoId_elapsedHours: {
            elapsedHours,
            videoId: work.u2bId,
          },
        },
      });
      syncedRows += 1;
    }
  }

  return syncedRows;
}

async function syncTrafficSourceSnapshots({
  accessToken,
  endDate,
  works,
}: {
  accessToken: string;
  endDate: string;
  works: Awaited<ReturnType<typeof listAdminMusicWorks>>;
}) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");

  const videoIdToWork = new Map(
    works.flatMap((work) => (work.u2bId ? [[work.u2bId, work] as const] : [])),
  );
  const videoIds = Array.from(videoIdToWork.keys());
  const startDate = shiftDate(endDate, -(TRAFFIC_SOURCE_PERIOD_DAYS - 1));
  let syncedRows = 0;

  for (const chunk of chunkItems(videoIds, 25)) {
    const rows = await queryTrafficSourceMetrics({
      accessToken,
      endDate,
      startDate,
      videoIds: chunk,
    });

    for (const row of rows) {
      const work = videoIdToWork.get(row.videoId);
      if (!work) continue;
      await prisma.adminYoutubeVideoTrafficSourceSnapshot.upsert({
        create: {
          contentId: work.contentId,
          endDate,
          periodDays: TRAFFIC_SOURCE_PERIOD_DAYS,
          sourceType: row.sourceType,
          startDate,
          videoId: row.videoId,
          ...getTrafficSourceData(row),
        },
        update: {
          endDate,
          startDate,
          syncedAt: new Date(),
          ...getTrafficSourceData(row),
        },
        where: {
          videoId_periodDays_endDate_sourceType: {
            endDate,
            periodDays: TRAFFIC_SOURCE_PERIOD_DAYS,
            sourceType: row.sourceType,
            videoId: row.videoId,
          },
        },
      });
      syncedRows += 1;
    }
  }

  return syncedRows;
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

async function queryTrafficSourceMetrics({
  accessToken,
  endDate,
  startDate,
  videoIds,
}: {
  accessToken: string;
  endDate: string;
  startDate: string;
  videoIds: string[];
}) {
  const rows: VideoTrafficSourceRow[] = [];
  let startIndex = 1;

  while (true) {
    const params = new URLSearchParams({
      dimensions: "video,insightTrafficSourceType",
      endDate,
      filters: `video==${videoIds.join(",")}`,
      ids: "channel==MINE",
      maxResults: "500",
      metrics: TRAFFIC_SOURCE_METRICS,
      sort: "-views",
      startDate,
      startIndex: String(startIndex),
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
          "YouTube traffic source report could not be loaded.",
      );
    }

    const pageRows = parseTrafficSourceRows(payload);
    rows.push(...pageRows);
    if (pageRows.length < 500) break;
    startIndex += pageRows.length;
  }

  return rows;
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

function parseTrafficSourceRows(payload: AnalyticsResponse | null) {
  const headers = payload?.columnHeaders?.map((header) => header.name) ?? [];
  const rows: VideoTrafficSourceRow[] = [];

  for (const row of payload?.rows ?? []) {
    const record = Object.fromEntries(
      headers.map((header, index) => [header, row[index]]),
    );
    const videoId = typeof record.video === "string" ? record.video : null;
    const sourceType =
      typeof record.insightTrafficSourceType === "string"
        ? record.insightTrafficSourceType
        : null;
    if (!videoId || !sourceType) continue;

    rows.push({
      engagedViews: toInteger(record.engagedViews),
      estimatedMinutesWatched: toOptionalNumber(record.estimatedMinutesWatched),
      sourceType,
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

function getEarlyPerformanceData(core: VideoMetricRow) {
  return {
    averageViewDuration: core.averageViewDuration,
    averageViewPercentage: core.averageViewPercentage,
    comments: core.comments,
    estimatedMinutesWatched: core.estimatedMinutesWatched,
    likes: core.likes,
    shares: core.shares,
    subscribersGained: core.subscribersGained,
    views: core.views,
  };
}

function getTrafficSourceData(row: VideoTrafficSourceRow) {
  return {
    engagedViews: row.engagedViews,
    estimatedMinutesWatched: row.estimatedMinutesWatched,
    views: row.views,
  };
}

function getSyncMessage(
  warnings: Set<string>,
  publicStatsCount: number,
  lifetimeAnalyticsRows: number,
  earlyPerformanceRows: number,
  trafficSourceRows: number,
) {
  const base = `Synced quota-conscious YouTube stats for ${publicStatsCount} videos: Data API totals plus ${lifetimeAnalyticsRows} lifetime Analytics depth row(s), ${earlyPerformanceRows} early performance row(s), and ${trafficSourceRows} traffic source row(s).`;
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

function getDateOnly(value: string | null | undefined) {
  const date = value?.slice(0, 10);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function minDate(left: string, right: string) {
  return left < right ? left : right;
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
