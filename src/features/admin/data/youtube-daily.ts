import { getPrismaClient } from "@sovia/sound/data/prisma";
import { videoCatalogKey } from "./analytics-catalog";
import { analyticsDate, dateRange, shiftAnalyticsDate } from "./analytics-math";
import { preserveGeographyRows } from "./geography-rows";

import {
  createAnalyticsReportReader,
  type Value,
} from "./youtube-analytics-report";

const CORE =
  "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares";
const DAILY =
  "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost";

type Reader = ReturnType<typeof createAnalyticsReportReader>;
function numeric(row: Record<string, Value>, key: string) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function required(row: Record<string, Value>, key: string) {
  const value = numeric(row, key);
  if (value === null)
    throw new Error(`Analytics response missing ${key}; no zero substituted.`);
  return value;
}
function metrics(row: Record<string, Value>) {
  return {
    views: required(row, "views"),
    estimatedMinutesWatched: numeric(row, "estimatedMinutesWatched"),
    averageViewDuration: numeric(row, "averageViewDuration"),
    averageViewPercentage: numeric(row, "averageViewPercentage"),
    subscribersGained: required(row, "subscribersGained"),
    subscribersLost: required(row, "subscribersLost"),
  };
}

export async function syncYoutubeDailyAnalytics({
  accessToken,
  works,
}: {
  accessToken: string;
  works: {
    contentId: string;
    u2bId?: string | null;
    publishedAt?: string | null;
  }[];
}) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const catalogWorks = works.map((work) => {
    let publishedDate: string | null = null;
    try {
      publishedDate = work.publishedAt ? analyticsDate(work.publishedAt) : null;
    } catch {
      /* Unknown publication dates stay in every coverage key. */
    }
    return { u2bId: work.u2bId, publishedDate };
  });
  const catalog = videoCatalogKey(catalogWorks);
  const keyAtDate = (date: string) => videoCatalogKey(catalogWorks, date).key;
  if (catalog.duplicateVideoIds)
    throw new Error(
      "Duplicate YouTube video IDs in catalog; resolve before attributing daily views.",
    );
  const read = createAnalyticsReportReader(accessToken);
  const requestedEnd = shiftAnalyticsDate(analyticsDate(), -1);
  const latest = await prisma.adminYoutubeChannelDaily.findFirst({
    orderBy: { date: "desc" },
  });
  if (
    latest?.videoCoverageComplete &&
    latest.videoCatalogKey === keyAtDate(latest.date) &&
    Date.now() - latest.syncedAt.getTime() < 20 * 60 * 60 * 1000
  )
    return {
      availableEnd: latest.date,
      days: 0,
      videoWarnings: [] as string[],
    };
  // Initial channel history supports 365 vs previous 365; subsequent syncs refresh 14 days.
  const startDate = shiftAnalyticsDate(requestedEnd, latest ? -13 : -729);
  const channel = await read({
    dimensions: "day",
    metrics: DAILY,
    startDate,
    endDate: requestedEnd,
    sort: "day",
  });
  const days = channel.flatMap((row) =>
    typeof row.day === "string" ? [row.day] : [],
  );
  const availableEnd = days.sort().at(-1);
  if (!availableEnd)
    throw new Error(
      "No processed channel days returned; previous cache retained.",
    );
  for (const row of channel) {
    if (typeof row.day !== "string") continue;
    const data = metrics(row);
    await prisma.adminYoutubeChannelDaily.upsert({
      where: { date: row.day },
      create: { date: row.day, ...data },
      update: { ...data, videoCoverageComplete: false, syncedAt: new Date() },
    });
  }
  // Refresh the latest 14 days, then backfill at most one 90-day slice each day.
  const coveredDays = await prisma.adminYoutubeChannelDaily.findMany({
    where: { videoCoverageComplete: true },
    orderBy: { date: "asc" },
    select: { date: true, videoCatalogKey: true },
  });
  const earliestCovered = coveredDays.find(
    (row) => row.videoCatalogKey === keyAtDate(row.date),
  );
  const oldest = shiftAnalyticsDate(availableEnd, -729);
  const ranges = [
    { start: shiftAnalyticsDate(availableEnd, -13), end: availableEnd },
  ];
  if (!earliestCovered) ranges[0].start = shiftAnalyticsDate(availableEnd, -89);
  else if (
    earliestCovered.date > oldest &&
    (!latest || Date.now() - latest.syncedAt.getTime() > 20 * 60 * 60 * 1000)
  ) {
    const end = shiftAnalyticsDate(earliestCovered.date, -1);
    const start = shiftAnalyticsDate(end, -89);
    ranges.push({ start: start < oldest ? oldest : start, end });
  }
  const videoWorks = works.filter((work) => work.u2bId);
  const videoWarnings: string[] = [];
  try {
    for (const range of ranges) {
      if (!videoWorks.length) break;
      const all: {
        contentId: string;
        videoId: string;
        date: string;
        views: number;
        estimatedMinutesWatched: number | null;
        averageViewDuration: number | null;
        averageViewPercentage: number | null;
        subscribersGained: number;
        subscribersLost: number;
        likes: number;
        comments: number;
        shares: number;
      }[] = [];
      for (let index = 0; index < videoWorks.length; index += 500) {
        const batch = videoWorks.slice(index, index + 500);
        const byVideo = new Map(
          batch.map((work) => [work.u2bId, work.contentId]),
        );
        const rows = await read({
          dimensions: "day,video",
          metrics: CORE,
          filters: `video==${batch.map((work) => work.u2bId).join(",")}`,
          startDate: range.start,
          endDate: range.end,
          sort: "day,video",
        });
        for (const row of rows) {
          if (typeof row.video !== "string" || typeof row.day !== "string")
            continue;
          const contentId = byVideo.get(row.video);
          if (!contentId) continue;
          all.push({
            contentId,
            videoId: row.video,
            date: row.day,
            ...metrics(row),
            likes: required(row, "likes"),
            comments: required(row, "comments"),
            shares: required(row, "shares"),
          });
        }
      }
      // Replace only after every page/batch succeeds. Removed API rows cannot linger as stale positives.
      await prisma.$transaction(
        async (tx) => {
          await tx.adminYoutubeVideoDaily.deleteMany({
            where: { date: { gte: range.start, lte: range.end } },
          });
          if (all.length)
            await tx.adminYoutubeVideoDaily.createMany({ data: all });
          const datesByCatalog = new Map<string, string[]>();
          for (const date of dateRange(range.start, range.end)) {
            const key = keyAtDate(date);
            const dates = datesByCatalog.get(key) ?? [];
            dates.push(date);
            datesByCatalog.set(key, dates);
          }
          for (const [key, dates] of datesByCatalog)
            await tx.adminYoutubeChannelDaily.updateMany({
              where: { date: { in: dates } },
              data: { videoCoverageComplete: true, videoCatalogKey: key },
            });
        },
        { timeout: 30_000 },
      );
    }
  } catch (error) {
    videoWarnings.push(
      `Video daily cache incomplete: ${error instanceof Error ? error.message : "unknown error"}. Channel days are retained; independent stages may continue.`,
    );
  }
  return { availableEnd, days: channel.length, videoWarnings };
}

export async function syncYoutubeGeography(
  accessToken: string,
  endDate: string,
  requestBudget = 10,
) {
  const prisma = getPrismaClient();
  if (!prisma) return;
  const existing = await prisma.adminYoutubeGeographySnapshot.findFirst({
    where: { endDate },
    orderBy: { syncedAt: "desc" },
  });
  const previousEnd = shiftAnalyticsDate(endDate, -28);
  const pairs = await prisma.adminYoutubeGeographySnapshot.findMany({
    where: { endDate: { in: [endDate, previousEnd] } },
    distinct: ["dimension", "endDate"],
    select: { dimension: true, endDate: true },
  });
  if (
    pairs.length === 4 &&
    existing &&
    Date.now() - existing.syncedAt.getTime() < 20 * 60 * 60 * 1000
  )
    return;
  const read: Reader = createAnalyticsReportReader(
    accessToken,
    Math.max(0, Math.min(10, requestBudget)),
  );
  for (const dimension of ["country", "city"] as const) {
    for (const offset of [0, 28]) {
      const end = shiftAnalyticsDate(endDate, -offset);
      const start = shiftAnalyticsDate(end, -27);
      const cached = await prisma.adminYoutubeGeographySnapshot.findFirst({
        where: { dimension, startDate: start, endDate: end },
        orderBy: { syncedAt: "desc" },
      });
      if (
        cached &&
        Date.now() - cached.syncedAt.getTime() < 20 * 60 * 60 * 1000
      )
        continue;
      const rows = await read(
        {
          dimensions: dimension === "city" ? "city,country" : "country",
          metrics:
            dimension === "country"
              ? DAILY
              : "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
          startDate: start,
          endDate: end,
          sort: "-views",
          maxResults: dimension === "city" ? "250" : "500",
        },
        dimension === "city",
      );
      const data = rows.flatMap((row) =>
        typeof row[dimension] !== "string"
          ? []
          : [
              {
                dimension,
                location:
                  dimension === "city"
                    ? `${row.city} (${row.country})`
                    : String(row.country),
                startDate: start,
                endDate: end,
                views: required(row, "views"),
                estimatedMinutesWatched: numeric(
                  row,
                  "estimatedMinutesWatched",
                ),
                averageViewDuration: numeric(row, "averageViewDuration"),
                averageViewPercentage: numeric(row, "averageViewPercentage"),
                subscribersGained: numeric(row, "subscribersGained"),
                subscribersLost: numeric(row, "subscribersLost"),
              },
            ],
      );
      await prisma.$transaction(async (tx) => {
        await tx.adminYoutubeGeographySnapshot.deleteMany({
          where: { dimension, startDate: start, endDate: end },
        });
        if (data.length)
          await tx.adminYoutubeGeographySnapshot.createMany({
            data: preserveGeographyRows(data, start, end),
          });
      });
    }
  }
}
