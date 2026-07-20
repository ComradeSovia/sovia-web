import { listAdminMusicWorks } from "./music-admin";
import {
  getYoutubeAnalyticsSyncStatus,
  listLatestYoutubeAnalyticsSnapshots,
} from "./youtube-analytics";

type Snapshot = Awaited<
  ReturnType<typeof listLatestYoutubeAnalyticsSnapshots>
>[number];
type Work = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];

type GptWorkRow = {
  analytics: ReturnType<typeof serializeSnapshot>;
  diagnosis: ReturnType<typeof getDiagnosis>;
  work: ReturnType<typeof serializeWork>;
};

export async function getGptAnalyticsData() {
  const [works, snapshots, syncStatus] = await Promise.all([
    listAdminMusicWorks(),
    listLatestYoutubeAnalyticsSnapshots(),
    getYoutubeAnalyticsSyncStatus(),
  ]);
  const workByContentId = new Map(works.map((work) => [work.contentId, work]));
  const baseline = getBaseline(snapshots);
  const rows = snapshots.map((snapshot) => {
    const work = workByContentId.get(snapshot.contentId);
    return {
      analytics: serializeSnapshot(snapshot),
      diagnosis: getDiagnosis(snapshot, baseline),
      work: serializeWork(work, snapshot.contentId),
    };
  });

  return {
    baseline,
    rows,
    sync: syncStatus
      ? {
          endDate: syncStatus.endDate,
          message: syncStatus.message,
          startDate: syncStatus.startDate,
          status: syncStatus.status,
          syncedAt: syncStatus.syncedAt?.toISOString() ?? null,
          videoCount: syncStatus.videoCount,
        }
      : null,
    totals: getTotals(snapshots),
  };
}

export async function getGptAnalyticsOverview() {
  const data = await getGptAnalyticsData();
  return {
    baseline: data.baseline,
    coreQuestions: [
      "Did the title and thumbnail earn the click?",
      "Did the song retain viewers after the click?",
      "Did the work build the Sovia audience?",
    ],
    missingMetrics: [
      "impressions",
      "ctr",
      "retention10s",
      "retention30s",
      "retention60s",
    ],
    sync: data.sync,
    topWorks: data.rows.slice(0, 10),
    totals: data.totals,
  };
}

export async function listGptAnalyticsWorks({
  limit = 50,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
}) {
  const data = await getGptAnalyticsData();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  return {
    count: data.rows.length,
    items: data.rows.slice(safeOffset, safeOffset + safeLimit),
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function getGptAnalyticsWork(id: string) {
  const data = await getGptAnalyticsData();
  const item = data.rows.find(
    (row) =>
      row.work.contentId === id ||
      row.work.path === id ||
      row.work.youtube?.id === id,
  );
  return item ?? null;
}

export async function getGptAnalyticsCompare() {
  const data = await getGptAnalyticsData();
  const groups = new Map<string, GptWorkRow[]>();
  for (const row of data.rows) {
    const current = groups.get(row.diagnosis.label) ?? [];
    current.push(row);
    groups.set(row.diagnosis.label, current);
  }

  return {
    groups: Array.from(groups.entries()).map(([label, rows]) => ({
      label,
      rows: rows.slice(0, 20),
      total: rows.length,
    })),
    matrix: {
      highClickHighRetention: "Topic, packaging, and content are working.",
      highClickLowRetention:
        "Packaging gets the click, but the song/opening does not fulfill the promise.",
      lowClickHighRetention:
        "Song works after the click; title or thumbnail should be tested.",
      lowClickLowRetention: "Topic or overall direction needs review.",
    },
  };
}

function serializeWork(work: Work | undefined, contentId: string) {
  const youtubeId = work?.u2bId ?? null;

  return {
    contentId,
    description: {
      introText: work?.introText ?? null,
      productionNotes: work?.productionNotes ?? null,
      shortDescription: work?.shortDescription ?? null,
    },
    lyrics: work?.lyrics ?? null,
    path: work?.path ?? null,
    platforms: {
      bilibili: work?.bilibiliId
        ? {
            description: work.bilibiliDescription ?? null,
            id: work.bilibiliId,
            title: work.bilibiliTitle ?? null,
          }
        : null,
      pixiv: work?.pixivId
        ? {
            description: work.pixivDescription ?? null,
            id: work.pixivId,
            tags: work.pixivTags ?? null,
            title: work.pixivTitle ?? null,
          }
        : null,
      vk: work?.vkId
        ? {
            description: work.vkDescription ?? null,
            id: work.vkId,
            title: work.vkTitle ?? null,
          }
        : null,
    },
    publishedAt: work?.publishedAt ?? null,
    source: {
      artists: work?.fromArtists ?? null,
      details: work?.fromDetails ?? null,
      ip: work?.fromIp ?? null,
      series: work?.fromSeries ?? null,
      sourceUrl: work?.fromSource ?? null,
      title: work?.fromTitle ?? null,
      type: work?.fromType ?? null,
    },
    style: {
      musicStyle: work?.musicStyle ?? null,
      musicType: work?.musicType ?? null,
      workType: work?.workType ?? null,
    },
    subtitles: {
      languages: Object.keys(work?.subtitleTracks ?? {}),
      primaryLocale: work?.subtitlePrimaryLocale ?? null,
    },
    title: work?.songTitle || work?.title || contentId,
    visible: work?.visible ?? null,
    youtube: youtubeId
      ? {
          id: youtubeId,
          localizations: work?.youtubeLocalization ?? {},
          primaryLocale: work?.youtubePrimaryLocale ?? null,
          thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${youtubeId}`,
        }
      : null,
  };
}

function serializeSnapshot(snapshot: Snapshot) {
  const subscribersPer1000Views =
    snapshot.views > 0
      ? (snapshot.subscribersGained / snapshot.views) * 1000
      : null;

  return {
    averageViewDurationSeconds: snapshot.averageViewDuration,
    averageViewPercentage: snapshot.averageViewPercentage,
    comments: snapshot.comments,
    endDate: snapshot.endDate,
    estimatedMinutesWatched: snapshot.estimatedMinutesWatched,
    likes: snapshot.likes,
    missingCoreMetrics: [
      "impressions",
      "ctr",
      "retention10s",
      "retention30s",
      "retention60s",
    ],
    periodDays: snapshot.periodDays,
    shares: snapshot.shares,
    startDate: snapshot.startDate,
    subscribersGained: snapshot.subscribersGained,
    subscribersPer1000Views,
    syncedAt: snapshot.syncedAt.toISOString(),
    videoId: snapshot.videoId,
    views: snapshot.views,
    watchTimePerImpressionSeconds: null,
  };
}

function getTotals(snapshots: Snapshot[]) {
  return snapshots.reduce(
    (total, snapshot) => ({
      comments: total.comments + snapshot.comments,
      estimatedMinutesWatched:
        total.estimatedMinutesWatched + (snapshot.estimatedMinutesWatched ?? 0),
      likes: total.likes + snapshot.likes,
      subscribersGained: total.subscribersGained + snapshot.subscribersGained,
      views: total.views + snapshot.views,
    }),
    {
      comments: 0,
      estimatedMinutesWatched: 0,
      likes: 0,
      subscribersGained: 0,
      views: 0,
    },
  );
}

function getBaseline(snapshots: Snapshot[]) {
  return {
    averageViewDuration: median(
      snapshots.flatMap((snapshot) =>
        snapshot.averageViewDuration === null
          ? []
          : [snapshot.averageViewDuration],
      ),
    ),
    averageViewPercentage: median(
      snapshots.flatMap((snapshot) =>
        snapshot.averageViewPercentage === null
          ? []
          : [snapshot.averageViewPercentage],
      ),
    ),
    views: median(snapshots.map((snapshot) => snapshot.views)),
  };
}

function getDiagnosis(
  snapshot: Snapshot,
  baseline: ReturnType<typeof getBaseline>,
) {
  const highReach = baseline.views > 0 && snapshot.views >= baseline.views;
  const highRetention =
    snapshot.averageViewPercentage !== null &&
    baseline.averageViewPercentage > 0 &&
    snapshot.averageViewPercentage >= baseline.averageViewPercentage;

  if (highReach && highRetention) {
    return {
      label: "scale",
      summary: "Reach and retention are both above baseline.",
    };
  }
  if (highReach && !highRetention) {
    return {
      label: "retention_issue",
      summary:
        "The work gets reach, but the opening/song may not retain viewers.",
    };
  }
  if (!highReach && highRetention) {
    return {
      label: "reach_issue",
      summary:
        "Viewers stay after clicking; packaging, topic, or timing may limit reach.",
    };
  }
  return {
    label: "review",
    summary: "Below current baseline; compare topic, language, and timing.",
  };
}

function median(values: number[]) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
