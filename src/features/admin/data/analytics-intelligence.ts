import { getPrismaClient } from "@sovia/sound/data/prisma";
import {
  durationGroup,
  matchesDuration,
  matchesVocalLanguage,
  vocalLanguageGroup,
} from "@sovia/sound/model/content-performance-metadata";
import { videoCatalogKey } from "./analytics-catalog";
import {
  ANALYTICS_TIMEZONE,
  analyticsDate,
  comparisonPeriod,
  completePeriodSum,
  dateRange,
  diagnosePerformance,
  isCompletePublishWindow,
  median,
  metricChange,
  rankPerformance,
  shiftAnalyticsDate,
  weightedMean,
} from "./analytics-math";
import { listAdminMusicWorks } from "./music-admin";
import { listLatestYoutubeEarlyPerformanceSnapshots } from "./youtube-analytics";

export type CohortKind =
  | "recent"
  | "sameSourceIp"
  | "sameSourceType"
  | "sameStyle"
  | "sameLanguage"
  | "sameVocalLanguage"
  | "similarDuration";
type Work = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];
export type EarlyRow = Awaited<
  ReturnType<typeof listLatestYoutubeEarlyPerformanceSnapshots>
>[number];
const IP_ALIASES: Record<string, string> = {
  "genshin impact": "Genshin Impact",
  原神: "Genshin Impact",
  genshin: "Genshin Impact",
  "honkai: star rail": "Honkai: Star Rail",
  "崩坏：星穹铁道": "Honkai: Star Rail",
  "honkai star rail": "Honkai: Star Rail",
  arknights: "Arknights",
  明日方舟: "Arknights",
  "arknights: endfield": "Arknights: Endfield",
  "明日方舟：终末地": "Arknights: Endfield",
  "wuthering waves": "Wuthering Waves",
  鸣潮: "Wuthering Waves",
  鳴潮: "Wuthering Waves",
  "ace combat": "ACE COMBAT",
  "final fantasy": "Final Fantasy",
};
export function normalizeSourceIp(ip?: string | null, series?: string | null) {
  const raw = ip?.trim();
  if (!raw) return "Unknown IP";
  const normalized = IP_ALIASES[raw.normalize("NFKC").toLowerCase()] ?? raw;
  const specific = series?.trim();
  if (
    specific &&
    /endfield|终末地|終末地/i.test(specific) &&
    normalized === "Arknights"
  )
    return "Arknights: Endfield";
  return specific && specific.toLowerCase() !== normalized.toLowerCase()
    ? `${normalized} / ${specific}`
    : normalized;
}
function safePublishedDate(work: Work) {
  try {
    return work.publishedAt ? analyticsDate(work.publishedAt) : null;
  } catch {
    return null;
  }
}
export async function getChannelIntelligence(
  input: { days?: number; start?: string; end?: string } = {},
) {
  const prisma = getPrismaClient();
  if (!prisma) return null;
  const latest = await prisma.adminYoutubeChannelDaily.findFirst({
    orderBy: { date: "desc" },
  });
  const days = [7, 28, 90, 365].includes(input.days ?? 28)
    ? (input.days ?? 28)
    : 28;
  const yesterday = shiftAnalyticsDate(analyticsDate(), -1);
  const end = input.end || latest?.date || yesterday;
  const start = input.start || shiftAnalyticsDate(end, -(days - 1));
  const dates = dateRange(start, end);
  if (end > yesterday || dates.length > 365)
    throw new Error("Choose up to 365 completed Pacific calendar days.");
  const previous = comparisonPeriod(start, end);
  const [channel, video, reach, works] = await Promise.all([
    prisma.adminYoutubeChannelDaily.findMany({
      where: { date: { gte: previous.start, lte: end } },
      orderBy: { date: "asc" },
    }),
    prisma.adminYoutubeVideoDaily.findMany({
      where: { date: { gte: previous.start, lte: end } },
    }),
    prisma.adminYoutubeVideoReachDaily.findMany({
      where: { date: { gte: previous.start, lte: end } },
    }),
    listAdminMusicWorks(),
  ]);
  const catalogWorks = works.map((work) => ({
    u2bId: work.u2bId,
    publishedDate: safePublishedDate(work),
  }));
  const catalog = videoCatalogKey(catalogWorks);
  const byDate = new Map(channel.map((row) => [row.date, row]));
  function period(from: string, to: string) {
    const expected = dateRange(from, to);
    const rows = channel.filter((row) => row.date >= from && row.date <= to);
    const complete = expected.every((date) => byDate.has(date));
    const catalogComplete =
      complete &&
      !catalog.duplicateVideoIds &&
      rows.every(
        (row) =>
          row.videoCoverageComplete &&
          row.videoCatalogKey === videoCatalogKey(catalogWorks, row.date).key,
      );
    const sum = (key: "views" | "subscribersGained" | "subscribersLost") =>
      completePeriodSum(rows, from, to, (row) => row[key]);
    const gained = sum("subscribersGained"),
      lost = sum("subscribersLost");
    return {
      start: from,
      end: to,
      expectedDays: expected.length,
      availableDays: rows.length,
      complete,
      catalogComplete,
      views: sum("views"),
      subscribersGained: gained,
      subscribersLost: lost,
      netSubscribers: gained === null || lost === null ? null : gained - lost,
      watchMinutes: completePeriodSum(
        rows,
        from,
        to,
        (row) => row.estimatedMinutesWatched,
      ),
      published: works.filter(
        (work) =>
          work.u2bId &&
          (safePublishedDate(work) ?? "") >= from &&
          (safePublishedDate(work) ?? "") <= to,
      ).length,
    };
  }
  const current = period(start, end),
    prior = period(previous.start, previous.end);
  const contributions = works
    .filter((work) => work.u2bId)
    .map((work) => {
      const rows = video.filter((row) => row.videoId === work.u2bId);
      const selected = rows.filter(
        (row) => row.date >= start && row.date <= end,
      );
      const earlier = rows.filter(
        (row) => row.date >= previous.start && row.date <= previous.end,
      );
      const currentViews = current.catalogComplete
        ? selected.reduce((sum, row) => sum + row.views, 0)
        : null;
      const previousViews = prior.catalogComplete
        ? earlier.reduce((sum, row) => sum + row.views, 0)
        : null;
      const published = safePublishedDate(work);
      return {
        contentId: work.contentId,
        title: work.songTitle || work.title,
        ip: normalizeSourceIp(work.fromIp, work.fromSeries),
        published,
        newRelease:
          published !== null && published >= start && published <= end,
        previousNewRelease:
          published !== null &&
          published >= previous.start &&
          published <= previous.end,
        views: currentViews,
        previousViews,
        delta: metricChange(currentViews, previousViews).delta,
        netSubscribers: current.catalogComplete
          ? selected.reduce(
              (sum, row) => sum + row.subscribersGained - row.subscribersLost,
              0,
            )
          : null,
      };
    });
  const attributable = current.catalogComplete && prior.catalogComplete;
  const sumViews = (
    rows: typeof contributions,
    key: "views" | "previousViews",
  ) => rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);
  const newDelta = attributable
    ? sumViews(
        contributions.filter((row) => row.newRelease),
        "views",
      ) -
      sumViews(
        contributions.filter((row) => row.previousNewRelease),
        "previousViews",
      )
    : null;
  const backDelta = attributable
    ? sumViews(
        contributions.filter((row) => !row.newRelease),
        "views",
      ) -
      sumViews(
        contributions.filter((row) => !row.previousNewRelease),
        "previousViews",
      )
    : null;
  const totalChange = metricChange(current.views, prior.views);
  const top = [...contributions].sort(
    (a, b) => (b.views ?? -1) - (a.views ?? -1),
  );
  return {
    source: "YouTube Analytics API",
    granularity: "daily",
    timezone: ANALYTICS_TIMEZONE,
    start,
    end,
    previous,
    syncedAt: latest?.syncedAt.toISOString() ?? null,
    stale:
      !latest || Date.now() - latest.syncedAt.getTime() > 48 * 60 * 60 * 1000,
    current,
    prior,
    changes: {
      views: totalChange,
      watchMinutes: metricChange(current.watchMinutes, prior.watchMinutes),
      gained: metricChange(current.subscribersGained, prior.subscribersGained),
      lost: metricChange(current.subscribersLost, prior.subscribersLost),
      netSubscribers: metricChange(
        current.netSubscribers,
        prior.netSubscribers,
      ),
    },
    daily: dates.map((date) => {
      const row = byDate.get(date);
      const knownReach = reach.filter((item) => item.date === date);
      return {
        date,
        metrics: row ?? null,
        published: works.filter(
          (work) => work.u2bId && safePublishedDate(work) === date,
        ).length,
        trackedImpressions: knownReach.length
          ? knownReach.reduce((sum, item) => sum + item.impressions, 0)
          : null,
        trackedCtr: weightedMean(
          knownReach.map((item) => ({
            value: item.impressionClickThroughRate,
            weight: item.impressions,
          })),
        ),
      };
    }),
    breakdown: {
      available: attributable,
      newReleasesDelta: newDelta,
      backCatalogDelta: backDelta,
      untrackedResidualDelta:
        totalChange.delta !== null && newDelta !== null && backDelta !== null
          ? totalChange.delta - newDelta - backDelta
          : null,
      top10Share:
        current.catalogComplete && current.views
          ? sumViews(top.slice(0, 10), "views") / current.views
          : null,
      note: "Release cohorts are defined within each period; back catalog is the complement. Residual covers untracked/channel-only activity. This is an arithmetic decomposition, not causal attribution. Traffic-source changes require aligned period reports and are not inferred.",
    },
    duplicateCatalogVideoIds: catalog.duplicateVideoIds,
    contributions,
    topGainers: [...contributions]
      .filter((row) => row.delta !== null && row.delta > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
      .slice(0, 10),
    topDecliners: [...contributions]
      .filter((row) => row.delta !== null && row.delta < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      .slice(0, 10),
    limitations: [
      "Missing dates remain unknown. Default end date is the latest processed API day; custom ranges are not silently shifted.",
      "Reach covers tracked works only and may have different coverage from channel totals.",
      "Daily average duration and percentage are API values; no unweighted period average is constructed.",
    ],
  };
}

export async function getPublishAgeIntelligence({
  id,
  hours = 168,
  limit = 20,
  cohort = "recent",
  matchDuration = false,
}: {
  id: string;
  hours?: number;
  limit?: number;
  cohort?: CohortKind;
  matchDuration?: boolean;
}) {
  const [works, snapshots] = await Promise.all([
    listAdminMusicWorks(),
    listLatestYoutubeEarlyPerformanceSnapshots(),
  ]);
  const targetWork = works.find(
    (work) => work.contentId === id || work.u2bId === id || work.path === id,
  );
  if (!targetWork) return null;
  const target = snapshots.find(
    (row) =>
      row.contentId === targetWork.contentId &&
      row.videoId === targetWork.u2bId &&
      row.elapsedHours === hours &&
      isCompletePublishWindow(row),
  );
  const sameGroup = (work: Work) => {
    if (
      matchDuration &&
      !matchesDuration(work.durationSeconds, targetWork.durationSeconds)
    )
      return false;
    if (cohort === "sameVocalLanguage")
      return matchesVocalLanguage(
        work.vocalLanguages,
        targetWork.vocalLanguages,
      );
    if (cohort === "similarDuration")
      return matchesDuration(work.durationSeconds, targetWork.durationSeconds);
    if (cohort === "sameSourceIp")
      return (
        !!targetWork.fromIp &&
        normalizeSourceIp(work.fromIp, work.fromSeries) ===
          normalizeSourceIp(targetWork.fromIp, targetWork.fromSeries)
      );
    if (cohort === "sameSourceType")
      return !!targetWork.fromType && work.fromType === targetWork.fromType;
    if (cohort === "sameStyle")
      return !!targetWork.workType && work.workType === targetWork.workType;
    if (cohort === "sameLanguage")
      return (
        !!targetWork.youtubePrimaryLocale &&
        work.youtubePrimaryLocale === targetWork.youtubePrimaryLocale
      );
    return true;
  };
  const candidates = works
    .filter(
      (work) =>
        work.u2bId &&
        work.contentId !== targetWork.contentId &&
        work.u2bId !== targetWork.u2bId &&
        work.publishedAt &&
        sameGroup(work),
    )
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""),
    )
    .slice(0, [10, 20, 50].includes(limit) ? limit : 20);
  const peers = candidates.flatMap((work) => {
    const row = snapshots.find(
      (item) =>
        item.contentId === work.contentId &&
        item.videoId === work.u2bId &&
        item.elapsedHours === hours &&
        isCompletePublishWindow(item),
    );
    return row ? [{ ...row, title: work.songTitle || work.title }] : [];
  });
  return {
    source: "YouTube Analytics API",
    timezone: ANALYTICS_TIMEZONE,
    granularity: "publish_date_window",
    label: `Publish-date ${hours / 24}-day window`,
    target: target ?? null,
    work: targetWork,
    cohort,
    matchDuration,
    durationBand: durationGroup(targetWork.durationSeconds),
    vocalLanguage: vocalLanguageGroup(targetWork.vocalLanguages),
    requestedPeers: candidates.length,
    missingPeers: candidates.length - peers.length,
    ranking: target ? rankPerformance(target, peers) : null,
    diagnosis: target ? diagnosePerformance(target, peers) : null,
    peers,
    hourly: {
      status: "not_available",
      note: "No precise historical 1h/3h/6h snapshots. Data API observation deltas are available separately; they are not exact post-publish counts.",
    },
    limitations: [
      "Only verified, completed windows with the same day count are compared. Legacy snapshots require re-sync.",
      "Metadata and vocal language are separate cohorts. Vocal-language sets match exactly; unknown languages/durations never match. Duration buckets: <120, 120–239, 240–359, 360–599, >=600 seconds.",
      "Same style uses the existing workType classification; source type and IP remain separate.",
    ],
  };
}

export async function getContentStrategy(hours = 168) {
  const [works, snapshots, channel] = await Promise.all([
    listAdminMusicWorks(),
    listLatestYoutubeEarlyPerformanceSnapshots(),
    getChannelIntelligence({ days: 28 }),
  ]);
  const valid = snapshots.filter(
    (row) =>
      row.elapsedHours === hours &&
      isCompletePublishWindow(row) &&
      works.some(
        (work) =>
          work.contentId === row.contentId && work.u2bId === row.videoId,
      ),
  );
  const workTypes: Record<string, string> = {
    O: "Original",
    CO: "Concept Original",
    C: "Cover",
    LC: "Lyric Rework Cover",
    R: "Reimagining",
  };
  function groups(
    dimension:
      | "ip"
      | "sourceType"
      | "workType"
      | "metadataLanguage"
      | "vocalLanguage"
      | "duration",
  ) {
    const buckets = new Map<string, Work[]>();
    for (const work of works.filter((item) => item.u2bId)) {
      const key =
        dimension === "vocalLanguage"
          ? vocalLanguageGroup(work.vocalLanguages)
          : dimension === "duration"
            ? durationGroup(work.durationSeconds)
            : dimension === "ip"
              ? normalizeSourceIp(work.fromIp, work.fromSeries)
              : dimension === "sourceType"
                ? work.fromType || "Unknown source type"
                : dimension === "metadataLanguage"
                  ? work.youtubePrimaryLocale || "Unknown metadata language"
                  : workTypes[work.workType] || work.workType;
      const bucket = buckets.get(key) ?? [];
      bucket.push(work);
      buckets.set(key, bucket);
    }
    return [...buckets]
      .map(([name, members]) => {
        const ids = new Set(members.map((work) => work.contentId));
        const rows = valid.filter((row) => ids.has(row.contentId));
        const views = rows.reduce((sum, row) => sum + row.views, 0);
        const net = rows.reduce(
          (sum, row) => sum + row.subscribersGained - row.subscribersLost,
          0,
        );
        const contributions =
          channel?.contributions.filter((row) => ids.has(row.contentId)) ?? [];
        return {
          name,
          workCount: members.length,
          measuredWorks: rows.length,
          missingWorks: members.length - rows.length,
          sampleWarning: rows.length < 5 ? "Small sample" : null,
          sameAgeViews: rows.length ? views : null,
          medianViews: median(rows.map((row) => row.views)),
          distribution: rows.map((row) => row.views).sort((a, b) => a - b),
          samples: rows.map((row) => ({
            contentId: row.contentId,
            startDate: row.startDate,
            endDate: row.endDate,
            syncedAt: row.syncedAt.toISOString(),
            views: row.views,
          })),
          medianCtr: median(rows.map((row) => row.impressionClickThroughRate)),
          weightedCtr: weightedMean(
            rows.map((row) => ({
              value: row.impressionClickThroughRate,
              weight: row.impressions ?? 0,
            })),
          ),
          medianViewPercentage: median(
            rows.map((row) => row.averageViewPercentage),
          ),
          watchMinutes:
            rows.length &&
            rows.every((row) => row.estimatedMinutesWatched !== null)
              ? rows.reduce(
                  (sum, row) => sum + (row.estimatedMinutesWatched ?? 0),
                  0,
                )
              : null,
          netSubscribers: rows.length ? net : null,
          netSubscribersPer1000Views: views ? (net / views) * 1000 : null,
          recent28DayViews: channel?.current.catalogComplete
            ? contributions.reduce((sum, row) => sum + (row.views ?? 0), 0)
            : null,
        };
      })
      .sort((a, b) => (b.medianViews ?? -1) - (a.medianViews ?? -1));
  }
  // Transparent eligibility rule rather than an invented model score.
  const evergreen =
    channel?.contributions
      .filter(
        (row) =>
          row.published &&
          row.published <= shiftAnalyticsDate(channel.start, -30) &&
          row.views !== null &&
          row.views > 0,
      )
      .map((row) => ({
        ...row,
        dailyViews: (row.views ?? 0) / 28,
        netSubscribersPer1000Views:
          row.views && row.netSubscribers !== null
            ? (row.netSubscribers / row.views) * 1000
            : null,
      }))
      .sort((a, b) => b.dailyViews - a.dailyViews) ?? [];
  return {
    source: "YouTube Analytics API",
    timezone: ANALYTICS_TIMEZONE,
    granularity: "publish_date_window",
    label: `Completed publish-date ${hours / 24}-day windows`,
    hours,
    ip: groups("ip"),
    sourceType: groups("sourceType"),
    workType: groups("workType"),
    metadataLanguage: groups("metadataLanguage"),
    vocalLanguage: groups("vocalLanguage"),
    duration: groups("duration"),
    evergreen: evergreen.slice(0, 20),
    period: channel
      ? {
          start: channel.start,
          end: channel.end,
          complete: channel.current.catalogComplete,
        }
      : null,
    limitations: [
      "Same-age groups can have missing works; sample coverage and distributions are provided. Choose duration cohorts/filters for length control; release era remains uncontrolled.",
      "Vocal language is editor-supplied. Duration is manual or filled from the Data API when unknown. Multilingual language sets form distinct groups; missing fields remain Unknown.",
      "Evergreen eligibility: published at least 30 days before the selected 28-day period; sorted by measured daily views. This is not a prediction or causal score.",
    ],
  };
}

export async function getAudienceIntelligence() {
  const prisma = getPrismaClient();
  if (!prisma) return null;
  const latest = await prisma.adminYoutubeGeographySnapshot.findFirst({
    orderBy: [{ endDate: "desc" }, { syncedAt: "desc" }],
  });
  if (!latest)
    return {
      available: false as const,
      items: [],
      note: "No cached geography report. Run an authorized sync after applying the migration.",
    };
  const rows = await prisma.adminYoutubeGeographySnapshot.findMany({
    where: {
      endDate: {
        in: [latest.endDate, shiftAnalyticsDate(latest.endDate, -28)],
      },
    },
    orderBy: { views: "desc" },
  });
  const channel = await prisma.adminYoutubeChannelDaily.findMany({
    where: { date: { gte: latest.startDate, lte: latest.endDate } },
  });
  const total =
    channel.length === 28
      ? channel.reduce((sum, row) => sum + row.views, 0)
      : null;
  return {
    available: true as const,
    source: "YouTube Analytics API",
    timezone: ANALYTICS_TIMEZONE,
    start: latest.startDate,
    end: latest.endDate,
    syncedAt: latest.syncedAt.toISOString(),
    items: rows
      .filter((row) => row.endDate === latest.endDate)
      .map((row) => {
        const prior = rows.find(
          (item) =>
            item.dimension === row.dimension &&
            item.location === row.location &&
            item.endDate === shiftAnalyticsDate(latest.endDate, -28),
        );
        return {
          ...row,
          share: total ? row.views / total : null,
          growth: metricChange(row.views, prior?.views ?? null),
        };
      }),
    note: "Geography is subject to privacy thresholds. Cities are the API top 250 only; an absent location is unknown, not zero. City subscriber counts are unavailable. Ambiguous city labels are preserved as separate period-scoped source rows and are not compared across periods. No user-level cross-video paths or new/returning viewer counts are inferred.",
  };
}
