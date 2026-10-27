// Pure calculations shared by the UI, MCP, sync, and offline tests.
export const ANALYTICS_TIMEZONE = "America/Los_Angeles";
export const VERIFIED_CALENDAR_GRANULARITY = "calendar_day_verified";
const DAY_MS = 86_400_000;

export function analyticsDate(value: Date | string = new Date()): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime()))
    throw new Error("Invalid analytics date.");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftAnalyticsDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function dateRange(start: string, end: string): string[] {
  const count =
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      DAY_MS +
    1;
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 730 ||
    shiftAnalyticsDate(start, 0) !== start ||
    shiftAnalyticsDate(end, 0) !== end
  )
    throw new Error("Choose a valid range of 1–730 days.");
  return Array.from({ length: count }, (_, index) =>
    shiftAnalyticsDate(start, index),
  );
}

export function comparisonPeriod(start: string, end: string) {
  const days = dateRange(start, end).length;
  return {
    start: shiftAnalyticsDate(start, -days),
    end: shiftAnalyticsDate(start, -1),
    days,
  };
}

export function metricChange(current: number | null, previous: number | null) {
  return {
    current,
    previous,
    delta: current === null || previous === null ? null : current - previous,
    percent:
      current === null || previous === null || previous === 0
        ? null
        : ((current - previous) / Math.abs(previous)) * 100,
  };
}

export function median(values: (number | null | undefined)[]): number | null {
  const sorted = values
    .filter((value): value is number => value != null && Number.isFinite(value))
    .sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length
    ? sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2
    : null;
}

export function weightedMean(
  rows: { value: number | null; weight: number }[],
): number | null {
  if (!rows.length || rows.some((row) => row.weight > 0 && row.value === null))
    return null;
  const weight = rows.reduce((sum, row) => sum + row.weight, 0);
  return weight > 0
    ? rows.reduce((sum, row) => sum + (row.value ?? 0) * row.weight, 0) / weight
    : null;
}

export type CalendarWindow = {
  startDate: string;
  endDate: string;
  elapsedHours: number;
  granularity: string;
};
export function isCompletePublishWindow(window: CalendarWindow): boolean {
  return (
    window.granularity === VERIFIED_CALENDAR_GRANULARITY &&
    [24, 72, 168, 672].includes(window.elapsedHours) &&
    window.endDate ===
      shiftAnalyticsDate(window.startDate, window.elapsedHours / 24 - 1)
  );
}

export type PerformanceMetrics = {
  views: number;
  estimatedMinutesWatched: number | null;
  averageViewPercentage: number | null;
  impressions: number | null;
  impressionClickThroughRate: number | null;
  subscribersGained: number;
  subscribersLost: number;
};

export function netSubscribersPer1000(
  row: Pick<
    PerformanceMetrics,
    "views" | "subscribersGained" | "subscribersLost"
  >,
): number | null {
  return row.views > 0
    ? ((row.subscribersGained - row.subscribersLost) / row.views) * 1000
    : null;
}

export function rankPerformance(
  target: PerformanceMetrics,
  peers: PerformanceMetrics[],
) {
  const cohortMedian = median(peers.map((row) => row.views));
  const best = peers.length ? Math.max(...peers.map((row) => row.views)) : null;
  return {
    sampleSize: peers.length,
    sampleWarning:
      peers.length < 5
        ? "Fewer than five comparable works; exploratory only."
        : null,
    rank: peers.length
      ? peers.filter((row) => row.views > target.views).length + 1
      : null,
    cohortMedian,
    best,
    differenceVsMedian: metricChange(target.views, cohortMedian),
    differenceVsBest: metricChange(target.views, best),
    netSubscribersPer1000Views: netSubscribersPer1000(target),
  };
}

export function diagnosePerformance(
  target: PerformanceMetrics,
  peers: PerformanceMetrics[],
) {
  const usable = peers.filter((row) => row.views >= 100);
  const ctrPeers = usable.filter(
    (row) =>
      row.impressions !== null &&
      row.impressions >= 1000 &&
      row.impressionClickThroughRate !== null,
  );
  const retentionSamples = usable.filter(
    (row) => row.averageViewPercentage !== null,
  ).length;
  const baseline = {
    views: median(usable.map((row) => row.views)),
    impressions: median(ctrPeers.map((row) => row.impressions)),
    ctr: median(ctrPeers.map((row) => row.impressionClickThroughRate)),
    retention: median(usable.map((row) => row.averageViewPercentage)),
    conversion: median(usable.map(netSubscribersPer1000)),
  };
  const evidence = {
    target,
    baseline,
    samples: usable.length,
    ctrSamples: ctrPeers.length,
    retentionSamples,
  };
  const hypotheses: string[] = [];
  if (usable.length < 5 || target.views < 100)
    return {
      status: "unknown",
      hypotheses,
      evidence,
      limitation: "Insufficient same-window samples or fewer than 100 views.",
    };
  const goodRetention =
    retentionSamples >= 5 &&
    target.averageViewPercentage !== null &&
    baseline.retention !== null &&
    target.averageViewPercentage >= baseline.retention;
  const ctrKnown =
    evidence.ctrSamples >= 5 &&
    target.impressions !== null &&
    target.impressions >= 1000 &&
    target.impressionClickThroughRate !== null &&
    baseline.ctr !== null;
  if (
    ctrKnown &&
    target.impressionClickThroughRate !== null &&
    baseline.ctr !== null &&
    target.impressions !== null &&
    baseline.impressions !== null
  ) {
    if (
      target.impressions < baseline.impressions &&
      target.impressionClickThroughRate >= baseline.ctr
    )
      hypotheses.push(
        "Distribution may be limited: impressions below median with CTR at or above median.",
      );
    if (
      target.impressions >= baseline.impressions &&
      target.impressionClickThroughRate < baseline.ctr
    )
      hypotheses.push(
        "Review title, thumbnail, and audience fit: impressions at or above median with CTR below median.",
      );
    if (
      target.impressionClickThroughRate >= baseline.ctr &&
      retentionSamples >= 5 &&
      target.averageViewPercentage !== null &&
      baseline.retention !== null &&
      !goodRetention
    )
      hypotheses.push(
        "Review opening, arrangement, and title promise: CTR at or above median with average viewed percentage below median.",
      );
  }
  if (goodRetention && baseline.views !== null && target.views < baseline.views)
    hypotheses.push(
      "Retention is at or above median while views are below median. Inspect distribution and traffic sources before judging the content.",
    );
  const conversion = netSubscribersPer1000(target);
  if (
    goodRetention &&
    baseline.views !== null &&
    target.views >= baseline.views &&
    conversion !== null &&
    baseline.conversion !== null &&
    conversion < baseline.conversion
  )
    hypotheses.push(
      "Views and retention are at or above median, but net subscriber conversion is below median. Single-song interest may not translate into channel loyalty.",
    );
  return {
    status: hypotheses.length ? "hypotheses" : "inconclusive",
    hypotheses,
    evidence,
    limitation: ctrKnown
      ? "Associations, not causal attribution; baseline is the selected same-age cohort median."
      : "CTR unknown or insufficient impressions/CTR samples; no packaging diagnosis is made.",
  };
}

export function completePeriodSum<T extends { date: string }>(
  rows: T[],
  start: string,
  end: string,
  value: (row: T) => number | null,
): number | null {
  const expected = dateRange(start, end);
  const selected = rows.filter((row) => row.date >= start && row.date <= end);
  const unique = new Set(selected.map((row) => row.date));
  if (
    unique.size !== selected.length ||
    expected.some((date) => !unique.has(date))
  )
    return null;
  const values = selected.map(value);
  return values.some((item) => item === null || !Number.isFinite(item))
    ? null
    : values.reduce<number>((sum, item) => sum + (item ?? 0), 0);
}

export function canResumeAfterDaily(
  previous: { status: string; startedAt: Date } | null,
  checkpoint: { syncedAt: Date; videoCoverageComplete: boolean } | null,
  now = Date.now(),
): boolean {
  return (
    previous?.status === "error" &&
    checkpoint !== null &&
    !checkpoint.videoCoverageComplete &&
    checkpoint.syncedAt.getTime() >= previous.startedAt.getTime() &&
    now >= checkpoint.syncedAt.getTime() &&
    now - checkpoint.syncedAt.getTime() <= 60 * 60 * 1000
  );
}
