import { listAdminMusicWorks } from "./music-admin";
import {
  getMusicSearchCosineSimilarity,
  getMusicSearchEmbeddingText,
} from "./music-search-documents";
import {
  getSearchEmbeddings,
  getSearchQueryEmbedding,
} from "./music-search-embeddings";
import {
  getYoutubeAnalyticsSyncStatus,
  listLatestYoutubeAnalyticsSnapshots,
  listLatestYoutubeEarlyPerformanceSnapshots,
  listLatestYoutubeTrafficSourceSnapshots,
} from "./youtube-analytics";

type Snapshot = Awaited<
  ReturnType<typeof listLatestYoutubeAnalyticsSnapshots>
>[number];
type Work = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];
type EarlyPerformanceSnapshot = Awaited<
  ReturnType<typeof listLatestYoutubeEarlyPerformanceSnapshots>
>[number];
type TrafficSourceSnapshot = Awaited<
  ReturnType<typeof listLatestYoutubeTrafficSourceSnapshots>
>[number];

type McpWorkRow = {
  analytics: ReturnType<typeof serializeSnapshot>;
  diagnosis: ReturnType<typeof getDiagnosis>;
  work: ReturnType<typeof serializeWork>;
};

type ContentSearchFilters = {
  hasLyrics?: boolean;
  hasSubtitles?: boolean;
  hasYoutube?: boolean;
  language?: string;
  limit?: number;
  matchMode?: "hybrid" | "lexical" | "semantic";
  musicStyle?: string;
  offset?: number;
  q?: string;
  visible?: boolean;
  workType?: string;
};

type DuplicateCheckInput = {
  artist?: string;
  ip?: string;
  limit?: number;
  q?: string;
  sourceTitle?: string;
  title?: string;
};

type CohortCompareInput = {
  cohort?: "recent" | "sameLanguage" | "sameSourceIp" | "sameStyle";
  id: string;
  limit?: number;
};

type VersionCompareInput = {
  ids?: string[];
  limit?: number;
  q?: string;
};

export async function getAdminMcpAnalyticsData() {
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

export async function getAdminMcpAnalyticsOverview() {
  const data = await getAdminMcpAnalyticsData();
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

export async function listAdminMcpAnalyticsWorks({
  limit = 50,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
}) {
  const data = await getAdminMcpAnalyticsData();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  return {
    count: data.rows.length,
    items: data.rows.slice(safeOffset, safeOffset + safeLimit),
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function getAdminMcpAnalyticsWork(id: string) {
  const data = await getAdminMcpAnalyticsData();
  const item = data.rows.find(
    (row) =>
      row.work.contentId === id ||
      row.work.path === id ||
      row.work.youtube?.id === id,
  );
  return item ?? null;
}

export async function getAdminMcpAnalyticsCompare() {
  const data = await getAdminMcpAnalyticsData();
  const groups = new Map<string, McpWorkRow[]>();
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

export async function listAdminMcpContentWorks({
  limit = 50,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
}) {
  const works = await listAdminMusicWorks();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  return {
    count: works.length,
    items: works
      .slice(safeOffset, safeOffset + safeLimit)
      .map((work) => serializeWork(work, work.contentId)),
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function getAdminMcpContentWork(id: string) {
  const work =
    (await listAdminMusicWorks()).find(
      (item) => item.contentId === id || item.path === id || item.u2bId === id,
    ) ?? null;

  if (!work) return null;
  return serializeWork(work, work.contentId);
}

export async function searchAdminMcpContentWorks(
  filters: ContentSearchFilters,
) {
  const works = await listAdminMusicWorks();
  const safeLimit = getSafeLimit(filters.limit);
  const safeOffset = getSafeOffset(filters.offset);
  const candidates = works
    .map((work) => serializeWork(work, work.contentId))
    .filter((work) => matchesContentFilters(work, filters, false));
  const search = filters.q?.trim()
    ? await rankContentSearchWorks(candidates, filters.q, filters.matchMode)
    : {
        generatedEmbeddingCount: 0,
        items: candidates,
        mode: filters.matchMode ?? "hybrid",
        semanticAvailable: false,
      };

  return {
    count: search.items.length,
    filters: normalizeContentSearchFilters(filters),
    items: search.items
      .slice(safeOffset, safeOffset + safeLimit)
      .map(serializeContentSearchResult),
    limit: safeLimit,
    offset: safeOffset,
    search: {
      generatedEmbeddingCount: search.generatedEmbeddingCount,
      mode: search.mode,
      semanticAvailable: search.semanticAvailable,
    },
  };
}

export async function getAdminMcpRecentWorks({
  hasYoutube,
  limit,
  offset,
}: {
  hasYoutube?: boolean;
  limit?: number;
  offset?: number;
}) {
  const works = (await listAdminMusicWorks())
    .map((work) => serializeWork(work, work.contentId))
    .filter((work) =>
      typeof hasYoutube === "boolean"
        ? Boolean(work.youtube) === hasYoutube
        : true,
    )
    .sort((a, b) => getPublishedTime(b) - getPublishedTime(a));
  const safeLimit = getSafeLimit(limit);
  const safeOffset = getSafeOffset(offset);

  return {
    count: works.length,
    items: works.slice(safeOffset, safeOffset + safeLimit),
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function checkAdminMcpContentDuplicate(
  input: DuplicateCheckInput,
) {
  const works = (await listAdminMusicWorks()).map((work) =>
    serializeWork(work, work.contentId),
  );
  const safeLimit = getSafeLimit(input.limit ?? 20);
  const candidates = works
    .map((work) => ({
      match: getDuplicateMatch(work, input),
      work,
    }))
    .filter((item) => item.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, safeLimit);

  return {
    count: candidates.length,
    input: normalizeDuplicateInput(input),
    items: candidates,
    verdict:
      candidates[0]?.match.score && candidates[0].match.score >= 80
        ? "likely_duplicate_or_existing_version"
        : candidates.length
          ? "possible_related_or_partial_match"
          : "no_match_found",
  };
}

export async function getAdminMcpWorkInsight(id: string) {
  const data = await getAdminMcpAnalyticsData();
  const row =
    data.rows.find(
      (item) =>
        item.work.contentId === id ||
        item.work.path === id ||
        item.work.youtube?.id === id,
    ) ?? null;
  const work = row?.work ?? (await getAdminMcpContentWork(id));
  if (!work) return null;

  const comparableWorks = data.rows
    .filter((item) => item.work.contentId !== work.contentId)
    .map((item) => ({
      reasons: getComparableReasons(work, item.work),
      row: item,
    }))
    .filter((item) => item.reasons.length)
    .sort((a, b) => b.reasons.length - a.reasons.length)
    .slice(0, 5)
    .map((item) => ({
      analytics: item.row.analytics,
      contentId: item.row.work.contentId,
      diagnosis: item.row.diagnosis,
      reasons: item.reasons,
      title: item.row.work.title,
      youtube: item.row.work.youtube,
    }));

  const missingData = getMissingFields(work, row?.analytics ?? null);
  const strengths = getInsightStrengths(row, data.baseline, work);
  const risks = getInsightRisks(row, data.baseline, work, missingData);

  return {
    analytics: row?.analytics ?? null,
    comparableWorks,
    diagnosis: row?.diagnosis ?? {
      label: "no_analytics",
      summary: "No stored YouTube Analytics snapshot is available.",
    },
    missingData,
    recommendedQuestionsForAI: [
      "Does the title and thumbnail promise match the opening of the song?",
      "Does the first 30 seconds make the Sovia concept clear quickly enough?",
      "Is this work mostly riding source-IP demand, or does it build Sovia audience identity?",
      "Which comparable work suggests the next title, thumbnail, or arrangement test?",
    ],
    risks,
    strengths,
    summary: getInsightSummary(row, data.baseline, work, missingData),
    work,
  };
}

export async function compareAdminMcpAnalyticsCohort(
  input: CohortCompareInput,
) {
  const data = await getAdminMcpAnalyticsData();
  const target = findRow(data.rows, input.id);
  if (!target) return null;

  const safeLimit = getSafeLimit(input.limit ?? 10);
  const cohortType = input.cohort ?? "recent";
  const candidates = getCohortRows(data.rows, target, cohortType)
    .filter((row) => row.work.contentId !== target.work.contentId)
    .slice(0, safeLimit);
  const cohortRows = candidates.length ? candidates : data.rows;
  const baseline = getRowBaseline(cohortRows);

  return {
    baseline,
    cohort: cohortType,
    comparisons: getMetricComparisons(target, baseline),
    comparableWorks: candidates.map(toOutlierSummary),
    notes: [
      "This compares stored lifetime snapshots, not same-age first-day curves.",
      "Use sameStyle, sameLanguage, sameSourceIp, or recent to avoid comparing totally unrelated works.",
    ],
    target,
  };
}

export async function compareAdminMcpVersions(input: VersionCompareInput) {
  const data = await getAdminMcpAnalyticsData();
  const works = (await listAdminMusicWorks()).map((work) =>
    serializeWork(work, work.contentId),
  );
  const rowsByContentId = new Map(
    data.rows.map((row) => [row.work.contentId, row]),
  );
  const safeLimit = getSafeLimit(input.limit ?? 10);
  const selectedWorks = input.ids?.length
    ? input.ids
        .map((id) => works.find((work) => isWorkIdMatch(work, id)))
        .filter((work): work is ReturnType<typeof serializeWork> =>
          Boolean(work),
        )
    : works
        .map((work) => ({
          match: getDuplicateMatch(work, { q: input.q, title: input.q }),
          work,
        }))
        .filter((item) => item.match.score > 0)
        .sort((a, b) => b.match.score - a.match.score)
        .map((item) => item.work);
  const versions = selectedWorks
    .sort((a, b) => getPublishedTime(a) - getPublishedTime(b))
    .slice(0, safeLimit)
    .map((work) => ({
      analytics: rowsByContentId.get(work.contentId)?.analytics ?? null,
      contentId: work.contentId,
      diagnosis: rowsByContentId.get(work.contentId)?.diagnosis ?? null,
      differences: null,
      publishedAt: work.publishedAt,
      title: work.title,
      work,
    }));

  return {
    count: versions.length,
    input: {
      ids: input.ids,
      q: input.q,
    },
    notes: [
      "Versions are ordered by publish date.",
      "Use explicit ids for precise old-vs-remake comparison.",
    ],
    summary: getVersionComparisonSummary(versions),
    versions: versions.map((version, index) => ({
      ...version,
      differences:
        index === 0
          ? {
              label: "baseline version",
            }
          : getVersionDifferences(versions[0].work, version.work),
    })),
  };
}

export async function getAdminMcpEarlyPerformance({ id }: { id?: string }) {
  const work = id ? await getAdminMcpContentWork(id) : null;
  const snapshots = await listLatestYoutubeEarlyPerformanceSnapshots(
    work?.contentId ?? id,
  );

  return {
    granularity: "calendar_day",
    items: snapshots.map(serializeEarlyPerformanceSnapshot),
    notes: [
      "YouTube Analytics API data is date-window based here, not exact clock-hour data.",
      "24h means publish-date calendar day; 72h means publish date plus two days; 168h means publish date plus six days.",
      "The sync currently backfills the most recent 50 published YouTube works to stay quota-conscious.",
    ],
    work,
  };
}

export async function getAdminMcpTrafficSources({
  id,
  periodDays = 90,
}: {
  id?: string;
  periodDays?: number;
}) {
  const work = id ? await getAdminMcpContentWork(id) : null;
  const snapshots = await listLatestYoutubeTrafficSourceSnapshots(
    work?.contentId ?? id,
    periodDays,
  );

  return {
    items: snapshots.map(serializeTrafficSourceSnapshot),
    periodDays,
    sourceTypes: getTrafficSourceTypeDescriptions(),
    work,
  };
}

export async function findAdminMcpAnalyticsOutliers() {
  const data = await getAdminMcpAnalyticsData();
  const rows = data.rows;
  const subscriberRates = rows.flatMap((row) =>
    row.analytics.subscribersPer1000Views === null
      ? []
      : [row.analytics.subscribersPer1000Views],
  );
  const subscriberBaseline = median(subscriberRates);

  return {
    baseline: {
      ...data.baseline,
      subscribersPer1000Views: subscriberBaseline,
    },
    groups: {
      highSubscribersPer1000Views: rows
        .filter(
          (row) =>
            row.analytics.subscribersPer1000Views !== null &&
            row.analytics.subscribersPer1000Views >
              Math.max(subscriberBaseline, 0) &&
            row.analytics.views >= Math.max(data.baseline.views * 0.25, 1),
        )
        .slice(0, 20)
        .map(toOutlierSummary),
      lowReachHighRetention: rows
        .filter(
          (row) =>
            row.analytics.views < data.baseline.views &&
            row.analytics.averageViewPercentage !== null &&
            row.analytics.averageViewPercentage >=
              data.baseline.averageViewPercentage,
        )
        .slice(0, 20)
        .map(toOutlierSummary),
      missingAnalyticsDepth: rows
        .filter((row) => row.analytics.averageViewPercentage === null)
        .slice(0, 20)
        .map(toOutlierSummary),
      retentionIssue: rows
        .filter(
          (row) =>
            row.analytics.views >= data.baseline.views &&
            row.analytics.averageViewPercentage !== null &&
            row.analytics.averageViewPercentage <
              data.baseline.averageViewPercentage,
        )
        .slice(0, 20)
        .map(toOutlierSummary),
      strongOverall: rows
        .filter(
          (row) =>
            row.analytics.views >= data.baseline.views &&
            row.analytics.averageViewPercentage !== null &&
            row.analytics.averageViewPercentage >=
              data.baseline.averageViewPercentage,
        )
        .slice(0, 20)
        .map(toOutlierSummary),
    },
    notes: [
      "CTR, impressions, and retention checkpoints are not available in the stored dataset yet.",
      "Outliers use current stored lifetime Analytics snapshots and median baselines.",
    ],
  };
}

export async function listAdminMcpMissingContentFields() {
  const [works, snapshots] = await Promise.all([
    listAdminMusicWorks(),
    listLatestYoutubeAnalyticsSnapshots(),
  ]);
  const analyticsContentIds = new Set(
    snapshots.map((snapshot) => snapshot.contentId),
  );
  const serializedWorks = works.map((work) =>
    serializeWork(work, work.contentId),
  );
  const items = serializedWorks
    .map((work) => ({
      contentId: work.contentId,
      missing: getMissingFields(
        work,
        analyticsContentIds.has(work.contentId) ? {} : null,
      ),
      path: work.path,
      title: work.title,
      youtube: work.youtube,
    }))
    .filter((item) => item.missing.length);

  return {
    count: items.length,
    groups: {
      missingAnalytics: items.filter((item) =>
        item.missing.includes("analytics"),
      ),
      missingContentBasics: items.filter((item) =>
        item.missing.some((field) =>
          ["path", "publishedAt", "title", "visible"].includes(field),
        ),
      ),
      missingSubtitles: items.filter((item) =>
        item.missing.some((field) => field.startsWith("subtitles.")),
      ),
      missingYoutube: items.filter((item) =>
        item.missing.some((field) => field.startsWith("youtube.")),
      ),
      missingStyle: items.filter((item) =>
        item.missing.some((field) => field.startsWith("style.")),
      ),
    },
    items,
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

function serializeEarlyPerformanceSnapshot(snapshot: EarlyPerformanceSnapshot) {
  return {
    averageViewDurationSeconds: snapshot.averageViewDuration,
    averageViewPercentage: snapshot.averageViewPercentage,
    comments: snapshot.comments,
    elapsedHours: snapshot.elapsedHours,
    endDate: snapshot.endDate,
    estimatedMinutesWatched: snapshot.estimatedMinutesWatched,
    granularity: snapshot.granularity,
    likes: snapshot.likes,
    shares: snapshot.shares,
    startDate: snapshot.startDate,
    subscribersGained: snapshot.subscribersGained,
    syncedAt: snapshot.syncedAt.toISOString(),
    videoId: snapshot.videoId,
    views: snapshot.views,
  };
}

function serializeTrafficSourceSnapshot(snapshot: TrafficSourceSnapshot) {
  return {
    engagedViews: snapshot.engagedViews,
    endDate: snapshot.endDate,
    estimatedMinutesWatched: snapshot.estimatedMinutesWatched,
    periodDays: snapshot.periodDays,
    sourceType: snapshot.sourceType,
    sourceTypeDescription:
      getTrafficSourceTypeDescriptions()[snapshot.sourceType] ?? "Unknown",
    startDate: snapshot.startDate,
    syncedAt: snapshot.syncedAt.toISOString(),
    videoId: snapshot.videoId,
    views: snapshot.views,
  };
}

function getTrafficSourceTypeDescriptions() {
  return {
    ADVERTISING: "YouTube advertising",
    ANNOTATION: "Annotation",
    CAMPAIGN_CARD: "Campaign card",
    END_SCREEN: "End screen",
    EXT_URL: "External websites or apps",
    HASHTAGS: "Hashtag pages",
    LIVE_REDIRECT: "Live redirect",
    NO_LINK_EMBEDDED: "Embedded player without link",
    NO_LINK_OTHER: "Direct or unknown",
    NOTIFICATION: "Notifications",
    PLAYLIST: "Playlist",
    PRODUCT_PAGE: "Product page",
    PROMOTED: "Promoted",
    RELATED_VIDEO: "Suggested/related video",
    SHORTS: "Shorts feed",
    SOUND_PAGE: "Sound page",
    SUBSCRIBER: "Subscriptions feed",
    YT_CHANNEL: "Channel page",
    YT_OTHER_PAGE: "Other YouTube page",
    YT_SEARCH: "YouTube search",
  } as Record<string, string>;
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

function getSafeLimit(limit: number | undefined) {
  return Math.min(Math.max(limit ?? 50, 1), 100);
}

function getSafeOffset(offset: number | undefined) {
  return Math.max(offset ?? 0, 0);
}

function getPublishedTime(work: ReturnType<typeof serializeWork>) {
  const time = Date.parse(work.publishedAt ?? "");
  return Number.isFinite(time) ? time : 0;
}

function normalizeContentSearchFilters(filters: ContentSearchFilters) {
  return {
    hasLyrics: filters.hasLyrics,
    hasSubtitles: filters.hasSubtitles,
    hasYoutube: filters.hasYoutube,
    language: filters.language?.trim() || undefined,
    matchMode: filters.matchMode ?? "hybrid",
    musicStyle: filters.musicStyle?.trim() || undefined,
    q: filters.q?.trim() || undefined,
    visible: filters.visible,
    workType: filters.workType?.trim() || undefined,
  };
}

function matchesContentFilters(
  work: ReturnType<typeof serializeWork>,
  filters: ContentSearchFilters,
  includeQuery = true,
) {
  const query = filters.q?.trim().toLowerCase();
  if (includeQuery && query && !getSearchText(work).includes(query)) {
    return false;
  }

  const language = filters.language?.trim().toLowerCase();
  if (
    language &&
    !getWorkLanguages(work).some((locale) => locale.toLowerCase() === language)
  ) {
    return false;
  }

  if (
    filters.workType &&
    work.style.workType?.toLowerCase() !== filters.workType.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.musicStyle &&
    work.style.musicStyle?.toLowerCase() !== filters.musicStyle.toLowerCase()
  ) {
    return false;
  }
  if (
    typeof filters.hasYoutube === "boolean" &&
    Boolean(work.youtube) !== filters.hasYoutube
  ) {
    return false;
  }
  if (
    typeof filters.hasLyrics === "boolean" &&
    Boolean(work.lyrics?.trim()) !== filters.hasLyrics
  ) {
    return false;
  }
  if (
    typeof filters.hasSubtitles === "boolean" &&
    Boolean(work.subtitles.languages.length) !== filters.hasSubtitles
  ) {
    return false;
  }
  if (
    typeof filters.visible === "boolean" &&
    Boolean(work.visible) !== filters.visible
  ) {
    return false;
  }

  return true;
}

async function rankContentSearchWorks(
  works: ReturnType<typeof serializeWork>[],
  query: string,
  requestedMode: ContentSearchFilters["matchMode"],
) {
  const mode = requestedMode ?? "hybrid";
  const lexicalMatches = new Map(
    works.map((work) => [work.contentId, getLexicalSearchMatch(work, query)]),
  );
  let generatedEmbeddingCount = 0;
  let semanticAvailable = false;
  let semanticScores = new Map<string, number>();

  if (mode !== "lexical") {
    try {
      const documents = works.map((work) => ({
        contentId: work.contentId,
        text: getSearchEmbeddingText(work),
      }));
      const [storedEmbeddings, queryEmbedding] = await Promise.all([
        getSearchEmbeddings(documents),
        getSearchQueryEmbedding(query),
      ]);
      generatedEmbeddingCount = storedEmbeddings.generatedCount;
      semanticAvailable =
        storedEmbeddings.available && Boolean(queryEmbedding?.length);

      if (queryEmbedding) {
        semanticScores = new Map(
          works.map((work) => [
            work.contentId,
            getMusicSearchCosineSimilarity(
              queryEmbedding,
              storedEmbeddings.vectors.get(work.contentId),
            ),
          ]),
        );
      }
    } catch (error) {
      console.warn(
        "OpenAI semantic search unavailable; using lexical search.",
        {
          message: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  return {
    generatedEmbeddingCount,
    items: works
      .map((work) => {
        const lexical =
          lexicalMatches.get(work.contentId) ?? EMPTY_SEARCH_MATCH;
        const semanticScore = semanticScores.get(work.contentId) ?? 0;
        const score = getCombinedSearchScore(
          mode,
          lexical.score,
          semanticScore,
        );

        return {
          ...work,
          searchMatch: {
            confidence: getSearchConfidence(lexical.score, semanticScore),
            lexicalScore: toSearchScore(lexical.score),
            matchedFields: lexical.matchedFields,
            requiresConfirmation: !lexical.isExactIdentifier,
            score: toSearchScore(score),
            semanticScore: semanticAvailable
              ? toSearchScore(semanticScore)
              : null,
          },
        };
      })
      .filter((work) =>
        isSearchMatch(mode, work.searchMatch, semanticAvailable),
      )
      .sort(
        (left, right) =>
          right.searchMatch.score - left.searchMatch.score ||
          left.title.localeCompare(right.title),
      ),
    mode,
    semanticAvailable,
  };
}

const EMPTY_SEARCH_MATCH = {
  isExactIdentifier: false,
  matchedFields: [] as string[],
  score: 0,
};

function getLexicalSearchMatch(
  work: ReturnType<typeof serializeWork>,
  query: string,
) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return EMPTY_SEARCH_MATCH;

  const fields = getSearchFields(work);
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedFields = fields
    .filter((field) => normalizeText(field.value).includes(normalizedQuery))
    .map((field) => field.name);
  const allTermsMatch = queryTerms.every((term) =>
    fields.some((field) => normalizeText(field.value).includes(term)),
  );
  const exactIdentifier = fields.some(
    (field) =>
      field.isIdentifier && normalizeText(field.value) === normalizedQuery,
  );
  const exactTitle = fields.some(
    (field) => field.isTitle && normalizeText(field.value) === normalizedQuery,
  );
  const phraseTitleMatch = fields.some(
    (field) =>
      field.isTitle && normalizeText(field.value).includes(normalizedQuery),
  );
  const score = exactIdentifier
    ? 1
    : exactTitle
      ? 0.95
      : phraseTitleMatch
        ? 0.8
        : matchedFields.length
          ? 0.65
          : allTermsMatch
            ? 0.5
            : 0;

  return { isExactIdentifier: exactIdentifier, matchedFields, score };
}

function getSearchFields(work: ReturnType<typeof serializeWork>) {
  return [
    {
      isIdentifier: true,
      isTitle: false,
      name: "contentId",
      value: work.contentId,
    },
    { isIdentifier: true, isTitle: false, name: "path", value: work.path },
    {
      isIdentifier: true,
      isTitle: false,
      name: "youtubeId",
      value: work.youtube?.id,
    },
    { isIdentifier: false, isTitle: true, name: "title", value: work.title },
    {
      isIdentifier: false,
      isTitle: true,
      name: "sourceTitle",
      value: work.source.title,
    },
    {
      isIdentifier: false,
      isTitle: false,
      name: "sourceIp",
      value: work.source.ip,
    },
    {
      isIdentifier: false,
      isTitle: false,
      name: "sourceSeries",
      value: work.source.series,
    },
    {
      isIdentifier: false,
      isTitle: false,
      name: "artists",
      value: work.source.artists?.join(" "),
    },
    { isIdentifier: false, isTitle: false, name: "lyrics", value: work.lyrics },
    {
      isIdentifier: false,
      isTitle: false,
      name: "description",
      value: getSearchText(work),
    },
  ].filter(
    (field): field is typeof field & { value: string } =>
      typeof field.value === "string",
  );
}

function serializeContentSearchResult(
  work: ReturnType<typeof serializeWork> & {
    searchMatch?: {
      confidence: "high" | "low" | "medium";
      lexicalScore: number;
      matchedFields: string[];
      requiresConfirmation: boolean;
      score: number;
      semanticScore: number | null;
    };
  },
) {
  return {
    contentId: work.contentId,
    description: work.description.shortDescription,
    path: work.path,
    searchMatch: work.searchMatch ?? null,
    source: {
      artists: work.source.artists,
      ip: work.source.ip,
      series: work.source.series,
      title: work.source.title,
    },
    style: work.style,
    subtitleLanguages: work.subtitles.languages,
    title: work.title,
    youtubeId: work.youtube?.id ?? null,
  };
}

function getSearchEmbeddingText(work: ReturnType<typeof serializeWork>) {
  return getMusicSearchEmbeddingText({
    artists: work.source.artists,
    introText: work.description.introText,
    musicStyle: work.style.musicStyle,
    musicType: work.style.musicType,
    productionNotes: work.description.productionNotes,
    series: work.source.series,
    shortDescription: work.description.shortDescription,
    sourceIp: work.source.ip,
    sourceTitle: work.source.title,
    title: work.title,
    workType: work.style.workType,
  });
}

function getCombinedSearchScore(
  mode: NonNullable<ContentSearchFilters["matchMode"]>,
  lexicalScore: number,
  semanticScore: number,
) {
  if (mode === "lexical") return lexicalScore;
  if (mode === "semantic") return semanticScore;
  return Math.max(lexicalScore, semanticScore * 0.8);
}

function isSearchMatch(
  mode: NonNullable<ContentSearchFilters["matchMode"]>,
  match: {
    lexicalScore: number;
    semanticScore: number | null;
  },
  semanticAvailable: boolean,
) {
  if (mode === "lexical" || !semanticAvailable) {
    return match.lexicalScore > 0;
  }
  if (mode === "semantic") return (match.semanticScore ?? 0) >= 35;
  return match.lexicalScore > 0 || (match.semanticScore ?? 0) >= 45;
}

function getSearchConfidence(lexicalScore: number, semanticScore: number) {
  if (lexicalScore >= 0.95) return "high";
  if (lexicalScore >= 0.5 || semanticScore >= 0.7) return "medium";
  return "low";
}

function toSearchScore(value: number) {
  return Math.round(value * 100);
}

function getSearchText(work: ReturnType<typeof serializeWork>) {
  return [
    work.contentId,
    work.path,
    work.title,
    work.lyrics,
    work.description.introText,
    work.description.productionNotes,
    work.description.shortDescription,
    work.source.title,
    work.source.type,
    work.source.ip,
    work.source.series,
    work.source.details,
    work.source.artists?.join(" "),
    work.style.workType,
    work.style.musicType,
    work.style.musicStyle,
    work.youtube?.id,
    work.youtube?.url,
    ...Object.values(work.youtube?.localizations ?? {}).flatMap((value) =>
      value && typeof value === "object"
        ? Object.values(value as Record<string, unknown>)
        : [],
    ),
  ]
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .toLowerCase();
}

function getWorkLanguages(work: ReturnType<typeof serializeWork>) {
  return Array.from(
    new Set(
      [
        work.subtitles.primaryLocale,
        ...work.subtitles.languages,
        work.youtube?.primaryLocale,
        ...Object.keys(work.youtube?.localizations ?? {}),
      ].filter((locale): locale is string => Boolean(locale)),
    ),
  );
}

function isWorkIdMatch(work: ReturnType<typeof serializeWork>, id: string) {
  return work.contentId === id || work.path === id || work.youtube?.id === id;
}

function normalizeDuplicateInput(input: DuplicateCheckInput) {
  return {
    artist: input.artist?.trim() || undefined,
    ip: input.ip?.trim() || undefined,
    q: input.q?.trim() || undefined,
    sourceTitle: input.sourceTitle?.trim() || undefined,
    title: input.title?.trim() || undefined,
  };
}

function getDuplicateMatch(
  work: ReturnType<typeof serializeWork>,
  input: DuplicateCheckInput,
) {
  const normalized = normalizeDuplicateInput(input);
  const reasons: string[] = [];
  let score = 0;

  const titleQuery = normalizeText(normalized.title || normalized.q);
  const sourceTitleQuery = normalizeText(
    normalized.sourceTitle || normalized.q,
  );
  const artistQuery = normalizeText(normalized.artist);
  const ipQuery = normalizeText(normalized.ip);
  const searchQuery = normalizeText(normalized.q);

  if (titleQuery && normalizeText(work.title).includes(titleQuery)) {
    score += 45;
    reasons.push("title match");
  }
  if (
    sourceTitleQuery &&
    normalizeText(work.source.title).includes(sourceTitleQuery)
  ) {
    score += 35;
    reasons.push("source title match");
  }
  if (ipQuery && normalizeText(work.source.ip).includes(ipQuery)) {
    score += 20;
    reasons.push("source IP match");
  }
  if (
    artistQuery &&
    work.source.artists?.some((artist) =>
      normalizeText(artist).includes(artistQuery),
    )
  ) {
    score += 20;
    reasons.push("artist match");
  }
  if (searchQuery && getSearchText(work).includes(searchQuery)) {
    score += 15;
    reasons.push("full text match");
  }
  if (titleQuery && normalizeText(work.path).includes(titleQuery)) {
    score += 10;
    reasons.push("path match");
  }

  return {
    reasons,
    score: Math.min(score, 100),
  };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function findRow(rows: McpWorkRow[], id: string) {
  return (
    rows.find(
      (row) =>
        row.work.contentId === id ||
        row.work.path === id ||
        row.work.youtube?.id === id,
    ) ?? null
  );
}

function getCohortRows(
  rows: McpWorkRow[],
  target: McpWorkRow,
  cohort: NonNullable<CohortCompareInput["cohort"]>,
) {
  if (cohort === "recent") {
    return rows
      .filter((row) => row.work.publishedAt)
      .sort((a, b) => getPublishedTime(b.work) - getPublishedTime(a.work));
  }
  if (cohort === "sameStyle") {
    return rows.filter(
      (row) =>
        row.work.style.musicStyle &&
        row.work.style.musicStyle === target.work.style.musicStyle,
    );
  }
  if (cohort === "sameSourceIp") {
    return rows.filter(
      (row) =>
        row.work.source.ip && row.work.source.ip === target.work.source.ip,
    );
  }
  const targetLanguages = new Set(getWorkLanguages(target.work));
  return rows.filter((row) =>
    getWorkLanguages(row.work).some((locale) => targetLanguages.has(locale)),
  );
}

function getRowBaseline(rows: McpWorkRow[]) {
  return {
    averageViewDurationSeconds: median(
      rows.flatMap((row) =>
        row.analytics.averageViewDurationSeconds === null
          ? []
          : [row.analytics.averageViewDurationSeconds],
      ),
    ),
    averageViewPercentage: median(
      rows.flatMap((row) =>
        row.analytics.averageViewPercentage === null
          ? []
          : [row.analytics.averageViewPercentage],
      ),
    ),
    subscribersPer1000Views: median(
      rows.flatMap((row) =>
        row.analytics.subscribersPer1000Views === null
          ? []
          : [row.analytics.subscribersPer1000Views],
      ),
    ),
    views: median(rows.map((row) => row.analytics.views)),
  };
}

function getMetricComparisons(
  target: McpWorkRow,
  baseline: ReturnType<typeof getRowBaseline>,
) {
  return {
    averageViewDurationSeconds: compareMetric(
      target.analytics.averageViewDurationSeconds,
      baseline.averageViewDurationSeconds,
    ),
    averageViewPercentage: compareMetric(
      target.analytics.averageViewPercentage,
      baseline.averageViewPercentage,
    ),
    subscribersPer1000Views: compareMetric(
      target.analytics.subscribersPer1000Views,
      baseline.subscribersPer1000Views,
    ),
    views: compareMetric(target.analytics.views, baseline.views),
  };
}

function compareMetric(value: number | null, baseline: number) {
  if (value === null || baseline === 0) {
    return {
      baseline,
      deltaPercent: null,
      value,
    };
  }

  return {
    baseline,
    deltaPercent: ((value - baseline) / baseline) * 100,
    value,
  };
}

function getVersionDifferences(
  baseline: ReturnType<typeof serializeWork>,
  version: ReturnType<typeof serializeWork>,
) {
  return {
    descriptionChanged:
      baseline.description.shortDescription !==
      version.description.shortDescription,
    lyricsChanged: baseline.lyrics !== version.lyrics,
    sourceChanged:
      baseline.source.title !== version.source.title ||
      baseline.source.ip !== version.source.ip,
    styleChanged:
      baseline.style.musicStyle !== version.style.musicStyle ||
      baseline.style.workType !== version.style.workType,
    subtitleLanguagesAdded: version.subtitles.languages.filter(
      (locale) => !baseline.subtitles.languages.includes(locale),
    ),
    titleChanged: baseline.title !== version.title,
    youtubeLocalizationLanguagesAdded: Object.keys(
      version.youtube?.localizations ?? {},
    ).filter(
      (locale) =>
        !Object.keys(baseline.youtube?.localizations ?? {}).includes(locale),
    ),
  };
}

function getVersionComparisonSummary(
  versions: {
    analytics: ReturnType<typeof serializeSnapshot> | null;
    contentId: string;
    publishedAt: string | null;
    title: string;
    work: ReturnType<typeof serializeWork>;
  }[],
) {
  if (versions.length < 2) {
    return "Not enough versions were found. Provide explicit ids or a more specific query.";
  }

  const first = versions[0];
  const latest = versions[versions.length - 1];
  return `${versions.length} possible version(s) found. Earliest is ${first.title} (${first.contentId}, ${first.publishedAt ?? "unknown date"}); latest is ${latest.title} (${latest.contentId}, ${latest.publishedAt ?? "unknown date"}).`;
}

function getComparableReasons(
  work: ReturnType<typeof serializeWork>,
  other: ReturnType<typeof serializeWork>,
) {
  const reasons: string[] = [];
  if (work.style.workType && work.style.workType === other.style.workType) {
    reasons.push("same work type");
  }
  if (
    work.style.musicStyle &&
    work.style.musicStyle === other.style.musicStyle
  ) {
    reasons.push("same music style");
  }
  if (work.source.ip && work.source.ip === other.source.ip) {
    reasons.push("same source IP");
  }
  if (work.source.type && work.source.type === other.source.type) {
    reasons.push("same source type");
  }
  const languages = new Set(getWorkLanguages(work));
  if (getWorkLanguages(other).some((locale) => languages.has(locale))) {
    reasons.push("shared language");
  }
  return reasons;
}

function getInsightStrengths(
  row: McpWorkRow | null,
  baseline: ReturnType<typeof getBaseline>,
  work: ReturnType<typeof serializeWork>,
) {
  const strengths: string[] = [];
  if (!row) return strengths;
  if (row.analytics.views >= baseline.views) {
    strengths.push("Reach is at or above the current median baseline.");
  }
  if (
    row.analytics.averageViewPercentage !== null &&
    row.analytics.averageViewPercentage >= baseline.averageViewPercentage
  ) {
    strengths.push("Average viewed percentage is at or above baseline.");
  }
  if (
    row.analytics.subscribersPer1000Views !== null &&
    row.analytics.subscribersPer1000Views > 0
  ) {
    strengths.push("The work converts some viewers into subscribers.");
  }
  if (
    work.youtube?.localizations &&
    Object.keys(work.youtube.localizations).length
  ) {
    strengths.push("YouTube localization data exists for multiple languages.");
  }
  return strengths;
}

function getInsightRisks(
  row: McpWorkRow | null,
  baseline: ReturnType<typeof getBaseline>,
  work: ReturnType<typeof serializeWork>,
  missingData: string[],
) {
  const risks: string[] = [];
  if (!row) {
    risks.push(
      "No analytics snapshot is available, so performance diagnosis is limited.",
    );
  } else {
    if (
      row.analytics.views >= baseline.views &&
      row.analytics.averageViewPercentage !== null &&
      row.analytics.averageViewPercentage < baseline.averageViewPercentage
    ) {
      risks.push("Reach is decent, but retention is below baseline.");
    }
    if (
      row.analytics.views < baseline.views &&
      row.analytics.averageViewPercentage !== null &&
      row.analytics.averageViewPercentage >= baseline.averageViewPercentage
    ) {
      risks.push("Retention looks healthy, but reach is below baseline.");
    }
  }
  if (!work.youtube) risks.push("No YouTube ID is attached.");
  if (!work.subtitles.languages.length)
    risks.push("No subtitle tracks are stored.");
  if (missingData.length) {
    risks.push(`Missing data may limit analysis: ${missingData.join(", ")}.`);
  }
  return risks;
}

function getInsightSummary(
  row: McpWorkRow | null,
  baseline: ReturnType<typeof getBaseline>,
  work: ReturnType<typeof serializeWork>,
  missingData: string[],
) {
  if (!row) {
    return `${work.title} has content metadata, but no stored YouTube Analytics snapshot yet. Fill missing fields and sync analytics before judging performance.`;
  }

  const retention =
    row.analytics.averageViewPercentage === null
      ? "unknown retention"
      : row.analytics.averageViewPercentage >= baseline.averageViewPercentage
        ? "above-baseline retention"
        : "below-baseline retention";
  const reach =
    row.analytics.views >= baseline.views
      ? "above-baseline reach"
      : "below-baseline reach";
  const caveat = missingData.length
    ? ` Missing data: ${missingData.join(", ")}.`
    : "";

  return `${work.title} currently shows ${reach} and ${retention}. ${row.diagnosis.summary}${caveat}`;
}

function getMissingFields(
  work: ReturnType<typeof serializeWork>,
  analytics:
    | ReturnType<typeof serializeSnapshot>
    | Record<string, never>
    | null,
) {
  const missing: string[] = [];
  if (!work.title) missing.push("title");
  if (!work.path) missing.push("path");
  if (work.visible === null) missing.push("visible");
  if (!work.publishedAt) missing.push("publishedAt");
  if (!work.source.title) missing.push("source.title");
  if (!work.source.type) missing.push("source.type");
  if (!work.style.workType) missing.push("style.workType");
  if (!work.style.musicStyle) missing.push("style.musicStyle");
  if (!work.youtube) {
    missing.push("youtube.id");
  } else {
    if (!work.youtube.primaryLocale) missing.push("youtube.primaryLocale");
    if (!Object.keys(work.youtube.localizations ?? {}).length) {
      missing.push("youtube.localizations");
    }
  }
  if (!work.subtitles.primaryLocale) missing.push("subtitles.primaryLocale");
  if (!work.subtitles.languages.length) missing.push("subtitles.tracks");
  if (analytics === null) missing.push("analytics");
  return missing;
}

function toOutlierSummary(row: McpWorkRow) {
  return {
    analytics: row.analytics,
    contentId: row.work.contentId,
    diagnosis: row.diagnosis,
    path: row.work.path,
    title: row.work.title,
    youtube: row.work.youtube,
  };
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
