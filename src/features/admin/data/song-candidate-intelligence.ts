import {
  matchesDuration,
  matchesVocalLanguage,
  parseDurationSeconds,
  parseVocalLanguages,
} from "@sovia/sound/model/content-performance-metadata";
import { checkAdminMcpContentDuplicate } from "./admin-mcp-data";
import { normalizeSourceIp } from "./analytics-intelligence";
import {
  ANALYTICS_TIMEZONE,
  isCompletePublishWindow,
  median,
  netSubscribersPer1000,
} from "./analytics-math";
import {
  type CandidateComponent,
  calculateCandidateScore,
  isExactCandidateSource,
} from "./candidate-scoring";
import { listAdminMusicWorks } from "./music-admin";
import { listLatestYoutubeEarlyPerformanceSnapshots } from "./youtube-analytics";

export type SongCandidateInput = {
  title: string;
  sourceTitle?: string;
  artist?: string;
  ip?: string;
  series?: string;
  workType?: string;
  vocalLanguages?: string;
  durationSeconds?: string;
  hours?: number;
  allowRemake?: boolean;
};
export async function getSongCandidateIntelligence(
  rawInput: SongCandidateInput,
) {
  const input = {
    ...rawInput,
    sourceTitle: rawInput.sourceTitle?.trim() || undefined,
    artist: rawInput.artist?.trim() || undefined,
    ip: rawInput.ip?.trim() || undefined,
    series: rawInput.series?.trim() || undefined,
    workType: rawInput.workType?.trim() || undefined,
  };
  const title = input.title.trim();
  if (!title || title.length > 200)
    throw new Error("Candidate title is required (up to 200 characters).");
  if (
    [input.sourceTitle, input.artist, input.ip, input.series].some(
      (value) => value && value.length > 200,
    )
  )
    throw new Error("Candidate text fields must be at most 200 characters.");
  if (input.workType && !["O", "CO", "C", "LC", "R"].includes(input.workType))
    throw new Error("Invalid candidate work type.");
  const hours = input.hours ?? 168;
  if (![24, 72, 168, 672].includes(hours))
    throw new Error("Choose a completed 1/3/7/28-day publish window.");
  const vocalLanguages = parseVocalLanguages(input.vocalLanguages);
  const durationSeconds = parseDurationSeconds(input.durationSeconds);
  const [works, snapshots, duplicate] = await Promise.all([
    listAdminMusicWorks(),
    listLatestYoutubeEarlyPerformanceSnapshots(),
    checkAdminMcpContentDuplicate({
      title,
      sourceTitle: input.sourceTitle || title,
      artist: input.artist,
      ip: input.ip,
      limit: 20,
    }),
  ]);
  // Match over the complete catalog, independently of the paginated search preview.
  const exactRecords = works.filter((work) =>
    isExactCandidateSource(
      {
        ...input,
        title,
        ip: input.ip ? normalizeSourceIp(input.ip, input.series) : undefined,
      },
      {
        title: work.songTitle || work.title,
        sourceTitle: work.fromTitle,
        artists: work.fromArtists,
        ip: work.fromIp
          ? normalizeSourceIp(work.fromIp, work.fromSeries)
          : undefined,
      },
    ),
  );
  const exact = [
    ...new Map(
      exactRecords.map((work) => [work.u2bId || work.contentId, work]),
    ).values(),
  ];
  const measured = works.flatMap((work) => {
    const snapshot = snapshots.find(
      (row) =>
        row.contentId === work.contentId &&
        row.videoId === work.u2bId &&
        row.elapsedHours === hours &&
        isCompletePublishWindow(row),
    );
    return snapshot ? [{ work, snapshot }] : [];
  });
  // Multiple content records for one YouTube video must not inflate the evidence.
  const unique = [
    ...new Map(measured.map((item) => [item.snapshot.videoId, item])).values(),
  ];
  const referenceViews = unique.map((item) => item.snapshot.views);
  const conversionReference = unique
    .map((item) => netSubscribersPer1000(item.snapshot))
    .filter((value): value is number => value !== null);
  const inIp = (work: (typeof works)[number]) =>
    !!input.ip &&
    normalizeSourceIp(work.fromIp, work.fromSeries) ===
      normalizeSourceIp(input.ip, input.series);
  const inType = (work: (typeof works)[number]) =>
    !!input.workType && work.workType === input.workType;
  const inLanguage = (work: (typeof works)[number]) =>
    matchesVocalLanguage(work.vocalLanguages, vocalLanguages);
  const inDuration = (work: (typeof works)[number]) =>
    matchesDuration(work.durationSeconds, durationSeconds);
  const comparable = unique.filter(
    ({ work }) =>
      (!input.ip || inIp(work)) &&
      (!input.workType || inType(work)) &&
      (!vocalLanguages.length || inLanguage(work)) &&
      (!durationSeconds || inDuration(work)),
  );
  const definitions = [
    { key: "ip", label: "Same IP / series views", weight: 30, matches: inIp },
    {
      key: "workType",
      label: "Same work-type views",
      weight: 20,
      matches: inType,
    },
    {
      key: "vocalLanguage",
      label: "Same vocal-language-set views",
      weight: 15,
      matches: inLanguage,
    },
    {
      key: "duration",
      label: "Same duration-band views",
      weight: 10,
      matches: inDuration,
    },
  ];
  const components: CandidateComponent[] = definitions.map((definition) => {
    const rows = unique.filter(({ work }) => definition.matches(work));
    return {
      key: definition.key,
      label: definition.label,
      weight: definition.weight,
      sampleSize: rows.length,
      sampleIds: rows.map((item) => item.work.contentId),
      median: median(rows.map((item) => item.snapshot.views)),
      reference: referenceViews,
    };
  });
  const hasAttributes = Boolean(
    input.ip || input.workType || vocalLanguages.length || durationSeconds,
  );
  const conversion = hasAttributes
    ? comparable
        .map((item) => netSubscribersPer1000(item.snapshot))
        .filter((value): value is number => value !== null)
    : [];
  components.push({
    key: "conversion",
    label:
      "Net subscribers / 1,000 views in the intersection of provided attributes",
    weight: 25,
    sampleSize: conversion.length,
    sampleIds: comparable
      .filter((item) => netSubscribersPer1000(item.snapshot) !== null)
      .map((item) => item.work.contentId),
    median: median(conversion),
    reference: conversionReference,
  });
  return {
    source:
      "Stored YouTube Analytics API publish-date snapshots + explicit catalog metadata (editor vocal languages; manual/API duration)",
    timezone: ANALYTICS_TIMEZONE,
    label: `Completed publish-date ${hours / 24}-day windows`,
    input: { ...input, title, hours, vocalLanguages, durationSeconds },
    ...calculateCandidateScore({
      components,
      exactMatches: exact.length,
      allowRemake: input.allowRemake === true,
      possibleTitleMatches:
        exact.length === 0 &&
        duplicate.items.some((item) =>
          item.match.reasons.some(
            (reason) =>
              reason === "title match" || reason === "source title match",
          ),
        ),
    }),
    duplicate: {
      ...duplicate,
      exactSources: exact.map((work) => ({
        contentId: work.contentId,
        title: work.songTitle || work.title,
        sourceTitle: work.fromTitle,
        videoId: work.u2bId,
      })),
      truncatedPreview: duplicate.items.length >= 20,
    },
    baseline: {
      measuredWorks: unique.length,
      missingWorks: works.filter((work) => work.u2bId).length - unique.length,
      viewsMedian: median(referenceViews),
      netConversionMedian: median(conversionReference),
    },
    samples: unique.map(({ work, snapshot }) => ({
      contentId: work.contentId,
      videoId: work.u2bId,
      start: snapshot.startDate,
      end: snapshot.endDate,
      syncedAt: snapshot.syncedAt.toISOString(),
      views: snapshot.views,
      netSubscribersPer1000Views: netSubscribersPer1000(snapshot),
    })),
    freshness: {
      status: "unknown",
      note: "No external trend evidence was requested or fetched.",
    },
  };
}
