import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyticsDate,
  comparisonPeriod,
  completePeriodSum,
  dateRange,
  diagnosePerformance,
  isCompletePublishWindow,
  median,
  metricChange,
  netSubscribersPer1000,
  rankPerformance,
  weightedMean,
} from "../src/features/admin/data/analytics-math.ts";
import { createAnalyticsReportReader } from "../src/features/admin/data/youtube-analytics-report.ts";

const row = (overrides = {}) => ({
  views: 1000,
  estimatedMinutesWatched: 2000,
  averageViewPercentage: 60,
  impressions: 10000,
  impressionClickThroughRate: 0.05,
  subscribersGained: 10,
  subscribersLost: 2,
  ...overrides,
});

test("Pacific dates honor midnight and DST rather than UTC date", () => {
  assert.equal(analyticsDate("2026-10-27T02:00:00Z"), "2026-10-26");
  assert.equal(analyticsDate("2026-03-08T07:59:59Z"), "2026-03-07");
  assert.equal(analyticsDate("2026-03-08T08:00:00Z"), "2026-03-08");
  assert.equal(analyticsDate("2026-03-09T07:00:00Z"), "2026-03-09");
  assert.equal(analyticsDate("2026-10-27"), "2026-10-27");
});
test("adjacent custom periods have identical inclusive lengths across leap days", () => {
  assert.deepEqual(comparisonPeriod("2024-02-27", "2024-03-01"), {
    start: "2024-02-23",
    end: "2024-02-26",
    days: 4,
  });
  assert.equal(dateRange("2024-02-27", "2024-03-01").length, 4);
  assert.throws(() => dateRange("2026-02-30", "2026-03-03"));
  assert.throws(() => dateRange("2026-10-27", "2026-10-26"));
});
test("partial and legacy publish windows cannot enter complete same-age baselines", () => {
  const window = {
    startDate: "2026-10-01",
    endDate: "2026-10-28",
    elapsedHours: 672,
    granularity: "calendar_day_verified",
  };
  assert.equal(isCompletePublishWindow(window), true);
  assert.equal(
    isCompletePublishWindow({ ...window, endDate: "2026-10-20" }),
    false,
  );
  assert.equal(
    isCompletePublishWindow({ ...window, granularity: "calendar_day" }),
    false,
  );
  assert.equal(isCompletePublishWindow({ ...window, elapsedHours: 3 }), false);
});
test("zero is a measurement, null is unknown, and a zero baseline has no percent change", () => {
  assert.deepEqual(metricChange(0, 10), {
    current: 0,
    previous: 10,
    delta: -10,
    percent: -100,
  });
  assert.deepEqual(metricChange(10, 0), {
    current: 10,
    previous: 0,
    delta: 10,
    percent: null,
  });
  assert.equal(metricChange(null, 10).delta, null);
  assert.equal(median([]), null);
  assert.equal(median([null, 0, 10]), 5);
  assert.equal(median([1, 2, 3, 4, 100000]), 3);
});
test("period sums reject missing, duplicated, and null days without inventing zeroes", () => {
  const rows = [
    { date: "2026-10-01", views: 0 },
    { date: "2026-10-02", views: 10 },
  ];
  assert.equal(
    completePeriodSum(rows, "2026-10-01", "2026-10-02", (row) => row.views),
    10,
  );
  assert.equal(
    completePeriodSum(
      rows.slice(1),
      "2026-10-01",
      "2026-10-02",
      (row) => row.views,
    ),
    null,
  );
  assert.equal(
    completePeriodSum(
      [...rows, rows[0]],
      "2026-10-01",
      "2026-10-02",
      (row) => row.views,
    ),
    null,
  );
  assert.equal(
    completePeriodSum(rows, "2026-10-01", "2026-10-02", () => null),
    null,
  );
});
test("CTR is impression-weighted, excludes no missing positive-weight observations", () => {
  assert.equal(
    weightedMean([
      { value: 0.1, weight: 100 },
      { value: 0.01, weight: 900 },
    ]),
    0.019,
  );
  assert.equal(
    weightedMean([
      { value: null, weight: 100 },
      { value: 0.01, weight: 900 },
    ]),
    null,
  );
  assert.equal(weightedMean([{ value: null, weight: 0 }]), null);
});
test("subscriber conversion uses net subscribers and zero views remain unknown", () => {
  assert.equal(netSubscribersPer1000(row()), 8);
  assert.equal(netSubscribersPer1000(row({ views: 0 })), null);
});
test("ranking excludes target from peer median and shows small-sample limits", () => {
  const result = rankPerformance(row({ views: 200 }), [
    row({ views: 100 }),
    row({ views: 200 }),
    row({ views: 300 }),
  ]);
  assert.equal(result.rank, 2);
  assert.equal(result.cohortMedian, 200);
  assert.equal(result.differenceVsBest.delta, -100);
  assert.ok(result.sampleWarning);
  assert.equal(rankPerformance(row(), []).rank, null);
});
test("missing CTR never produces a thumbnail or low-CTR diagnosis", () => {
  const result = diagnosePerformance(
    row({ views: 200, impressions: null, impressionClickThroughRate: null }),
    Array.from({ length: 6 }, () => row()),
  );
  assert.ok(
    result.hypotheses.every(
      (text) => !/thumbnail|CTR below|title promise/.test(text),
    ),
  );
  assert.match(result.limitation, /CTR unknown/);
});
test("missing retention and tiny baselines remain unknown, not weak retention", () => {
  const peers = Array.from({ length: 6 }, () =>
    row({ averageViewPercentage: null }),
  );
  assert.deepEqual(
    diagnosePerformance(row({ averageViewPercentage: null }), peers).hypotheses,
    [],
  );
  assert.equal(diagnosePerformance(row(), peers.slice(0, 2)).status, "unknown");
});
test("observed high impressions and low CTR produce an explicit hypothesis with evidence", () => {
  const result = diagnosePerformance(
    row({ impressions: 20000, impressionClickThroughRate: 0.01 }),
    Array.from({ length: 6 }, () => row()),
  );
  assert.ok(result.hypotheses.some((text) => /thumbnail/.test(text)));
  assert.equal(result.evidence.baseline.ctr, 0.05);
  assert.equal(result.evidence.ctrSamples, 6);
});
test("report reader paginates and preserves null fields", async (t) => {
  const seen = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    seen.push(parsed.searchParams.get("startIndex"));
    return Response.json({
      columnHeaders: [{ name: "day" }, { name: "views" }],
      rows:
        seen.length === 1
          ? [
              ["2026-10-01", 0],
              ["2026-10-02", null],
            ]
          : [["2026-10-03", 20]],
    });
  });
  const rows = await createAnalyticsReportReader(
    "test-token",
    3,
  )({ dimensions: "day", maxResults: "2" });
  assert.deepEqual(seen, ["1", "3"]);
  assert.equal(rows[1].views, null);
  assert.equal(rows[0].views, 0);
});
test("report request budget fails rather than returning a truncated aggregate", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ columnHeaders: [{ name: "views" }], rows: [[1], [2]] }),
  );
  await assert.rejects(
    createAnalyticsReportReader("test-token", 1)({ maxResults: "2" }),
    /budget reached/,
  );
});
test("API failures propagate and cannot become zero rows", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: { message: "Quota unavailable" } }, { status: 403 }),
  );
  await assert.rejects(
    createAnalyticsReportReader("test-token")({ dimensions: "day" }),
    /Quota unavailable/,
  );
});

test("Reach CSV preserves missing CTR and refuses missing impressions or duplicate records", async () => {
  const { parseReachCsv } = await import(
    "../src/features/admin/data/youtube-reach-csv.ts"
  );
  const header =
    "date,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr\n";
  assert.deepEqual(parseReachCsv(`${header}20261001,video,1000,\n`), [
    { date: "2026-10-01", videoId: "video", impressions: 1000, ctr: null },
  ]);
  assert.equal(parseReachCsv(`${header}2026-10-01,video,0,0\n`)[0].ctr, 0);
  assert.throws(() => parseReachCsv(`${header}20261001,video,,0.1`), /Invalid/);
  assert.throws(
    () =>
      parseReachCsv(
        `${header}20261001,video,1000,0.1\n20261001,video,1000,0.1`,
      ),
    /Duplicate/,
  );
});

test("catalog coverage keys are order-independent and detect duplicate video assignments", async () => {
  const { videoCatalogKey } = await import(
    "../src/features/admin/data/analytics-catalog.ts"
  );
  assert.equal(
    videoCatalogKey([{ u2bId: "a" }, { u2bId: "b" }]).key,
    videoCatalogKey([{ u2bId: "b" }, { u2bId: "a" }]).key,
  );
  assert.notEqual(
    videoCatalogKey([{ u2bId: "a" }]).key,
    videoCatalogKey([{ u2bId: "a" }, { u2bId: "b" }]).key,
  );
  assert.equal(
    videoCatalogKey([{ u2bId: "a" }, { u2bId: "a" }]).duplicateVideoIds,
    true,
  );
});

test("a newly published video does not invalidate complete coverage before its release date", async () => {
  const { videoCatalogKey } = await import(
    "../src/features/admin/data/analytics-catalog.ts"
  );
  const old = [{ u2bId: "old", publishedDate: "2026-01-01" }];
  const updated = [...old, { u2bId: "new", publishedDate: "2026-10-27" }];
  assert.equal(
    videoCatalogKey(old, "2026-10-26").key,
    videoCatalogKey(updated, "2026-10-26").key,
  );
  assert.notEqual(
    videoCatalogKey(old, "2026-10-27").key,
    videoCatalogKey(updated, "2026-10-27").key,
  );
});

import {
  calculateCandidateScore,
  evidencePercentile,
  isExactCandidateSource,
} from "../src/features/admin/data/candidate-scoring.ts";
import {
  durationAfterVideoChange,
  durationGroup,
  matchesDuration,
  matchesVocalLanguage,
  parseDurationSeconds,
  parseVocalLanguages,
  parseYoutubeDuration,
  performanceMetadataUpdate,
  vocalLanguageGroup,
} from "../src/features/sound/model/content-performance-metadata.ts";

test("vocal language is explicit, normalized and independent of metadata language", () => {
  assert.deepEqual(parseVocalLanguages("RU-ru, ja; ru"), ["ja", "ru"]);
  assert.deepEqual(parseVocalLanguages(undefined), []);
  assert.deepEqual(parseVocalLanguages(null), []);
  assert.throws(() => parseVocalLanguages("unknown"));
  assert.throws(() => parseVocalLanguages("xx"));
  assert.throws(() => parseVocalLanguages("zxx, ru"));
  assert.throws(() => parseVocalLanguages("mul, ja"));
});
test("multilingual sets and no-vocal records form distinct groups", () => {
  assert.equal(vocalLanguageGroup(["ru", "ja"]), "Multilingual (ja + ru)");
  assert.equal(vocalLanguageGroup([]), "Unknown vocal language");
  assert.equal(vocalLanguageGroup(["mul"]), "Multilingual (unspecified)");
  assert.equal(vocalLanguageGroup(["zxx"]), "No vocals");
  assert.equal(matchesVocalLanguage(["ja", "ru"], ["ru", "ja"]), true);
  assert.equal(matchesVocalLanguage(["ru"], ["ru", "ja"]), false);
  assert.equal(matchesVocalLanguage([], []), false);
  assert.equal(matchesVocalLanguage(["mul"], ["ru", "ja"]), false);
});
test("duration buckets have explicit inclusive boundaries and exclude unknown peers", () => {
  for (const [seconds, expected] of [
    [119, "Under 2 min"],
    [120, "2–4 min"],
    [239, "2–4 min"],
    [240, "4–6 min"],
    [359, "4–6 min"],
    [360, "6–10 min"],
    [599, "6–10 min"],
    [600, "10 min or longer"],
  ])
    assert.equal(durationGroup(seconds), expected);
  assert.equal(durationGroup(null), "Unknown duration");
  assert.equal(matchesDuration(null, null), false);
  assert.equal(matchesDuration(120, 239), true);
  assert.equal(matchesDuration(239, 240), false);
});
test("manual duration accepts only positive integer seconds and preserves unknown", () => {
  assert.equal(parseDurationSeconds(" 240 "), 240);
  assert.equal(parseDurationSeconds(""), null);
  assert.equal(parseDurationSeconds("   "), null);
  for (const value of ["0", "-1", "1.5", "NaN", "Infinity", "2147483648"])
    assert.throws(() => parseDurationSeconds(value));
});
test("official ISO duration parsing never invents a duration for live/invalid responses", () => {
  assert.equal(parseYoutubeDuration("PT3M42S"), 222);
  assert.equal(parseYoutubeDuration("PT1H"), 3600);
  assert.equal(parseYoutubeDuration("P1DT2H3M4S"), 93784);
  for (const value of [null, undefined, "PT0S", "invalid", "PT", "P"])
    assert.equal(parseYoutubeDuration(value), null);
});
test("metadata persistence distinguishes omitted values from explicit clearing", () => {
  assert.deepEqual(performanceMetadataUpdate({}), {});
  assert.deepEqual(
    performanceMetadataUpdate({
      vocalLanguages: undefined,
      durationSeconds: undefined,
    }),
    {},
  );
  assert.deepEqual(
    performanceMetadataUpdate({ vocalLanguages: [], durationSeconds: null }),
    { vocalLanguages: [], durationSeconds: null },
  );
  assert.deepEqual(
    performanceMetadataUpdate({ vocalLanguages: ["ru"], durationSeconds: 240 }),
    { vocalLanguages: ["ru"], durationSeconds: 240 },
  );
});
test("changing/removing a video link invalidates its duration, unrelated saves preserve it", () => {
  assert.equal(durationAfterVideoChange("old", "new", 240), null);
  assert.equal(durationAfterVideoChange("old", null, 240), null);
  assert.equal(durationAfterVideoChange("same", "same", 240), 240);
  assert.equal(durationAfterVideoChange(undefined, null, 240), 240);
});
const component = (key, weight, overrides = {}) => ({
  key,
  label: key,
  weight,
  sampleSize: 10,
  median: 3,
  reference: [1, 2, 3, 4, 5],
  ...overrides,
});
const fullEvidence = () => [
  component("ip", 30),
  component("type", 20),
  component("vocal", 15),
  component("duration", 10),
  component("conversion", 25),
];
test("candidate percentiles handle ties, negative conversion and missing baselines", () => {
  assert.equal(evidencePercentile(3, [1, 2, 3, 4, 5]), 50);
  assert.equal(evidencePercentile(0, [0, 0, 0, 0, 0]), 50);
  assert.equal(evidencePercentile(-1, [-5, -3, -1, 0, 2]), 50);
  assert.equal(evidencePercentile(null, [1, 2, 3, 4, 5]), null);
  assert.equal(evidencePercentile(3, [1, 2, 3, 4]), null);
});
test("candidate score exposes fixed weights and observed evidence coverage", () => {
  const result = calculateCandidateScore({
    components: fullEvidence(),
    exactMatches: 0,
    allowRemake: false,
  });
  assert.equal(result.score, 50);
  assert.equal(result.evidenceCoveragePercent, 100);
  assert.equal(result.status, "scored");
  assert.equal(result.confidence, "higher");
  assert.equal(
    result.components.reduce((sum, item) => sum + item.weight, 0),
    100,
  );
});
test("missing candidate components are unknown, not a fabricated zero score", () => {
  const result = calculateCandidateScore({
    components: [component("ip", 30), component("type", 20, { median: null })],
    exactMatches: 0,
    allowRemake: false,
  });
  assert.equal(result.score, null);
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.components[1].percentile, null);
  assert.equal(result.evidenceCoveragePercent, 30);
});
test("candidate cohorts need five observations independently of baseline sample size", () => {
  const result = calculateCandidateScore({
    components: fullEvidence().map((item) => ({ ...item, sampleSize: 4 })),
    exactMatches: 0,
    allowRemake: false,
  });
  assert.equal(result.score, null);
  assert.equal(result.evidenceCoveragePercent, 0);
});
test("candidate exact duplicates are excluded by default even with complete performance evidence", () => {
  const result = calculateCandidateScore({
    components: fullEvidence(),
    exactMatches: 1,
    allowRemake: false,
  });
  assert.equal(result.status, "excluded_existing_source");
  assert.equal(result.score, null);
  assert.equal(result.rawScore, null);
});
test("explicit remake scoring applies a visible capped saturation penalty", () => {
  const one = calculateCandidateScore({
    components: fullEvidence(),
    exactMatches: 1,
    allowRemake: true,
  });
  assert.equal(one.remakePenalty, 5);
  assert.equal(one.score, 45);
  const many = calculateCandidateScore({
    components: fullEvidence(),
    exactMatches: 100,
    allowRemake: true,
  });
  assert.equal(many.remakePenalty, 20);
  assert.equal(many.score, 30);
});
test("candidate multilingual exact matching handles Unicode and disambiguates artist/IP", () => {
  assert.equal(
    isExactCandidateSource(
      { title: "勝利の歌", artist: "СОВИЯ", ip: "原神" },
      {
        title: "Alternate",
        sourceTitle: "勝利の歌",
        artists: ["Совия"],
        ip: "原神",
      },
    ),
    true,
  );
  assert.equal(
    isExactCandidateSource(
      { title: "Song", artist: "Other" },
      { title: "Song", artists: ["Sovia"] },
    ),
    false,
  );
  assert.equal(
    isExactCandidateSource({ title: "ＡＢＣ" }, { title: "abc" }),
    true,
  );
  assert.equal(
    isExactCandidateSource({ title: "Song" }, { title: "A Different Song" }),
    false,
  );
});
test("partial catalog matches require review and never assert that the song is unproduced", () => {
  const result = calculateCandidateScore({
    components: fullEvidence(),
    exactMatches: 0,
    allowRemake: false,
    possibleTitleMatches: true,
  });
  assert.equal(result.status, "review_partial_match");
  assert.equal(result.score, 50);
  assert.ok(
    result.limitations.some((note) => note.includes("does not guarantee")),
  );
});

test("failed daily API requests preserve their HTTP/dimension error and are not blindly retried", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json(
      { error: { message: "An internal error has occurred." } },
      { status: 500 },
    );
  });
  await assert.rejects(
    createAnalyticsReportReader("test-token", 50)({ dimensions: "day,video" }),
    /day,video report failed \(500\)/,
  );
  assert.equal(calls, 1);
});
test("sync recovery requires a fresh failed-run checkpoint and refuses unrelated or completed runs", async () => {
  const { canResumeAfterDaily } = await import(
    "../src/features/admin/data/analytics-math.ts"
  );
  const now = Date.parse("2026-10-27T15:00:00Z");
  const previous = { status: "error", startedAt: new Date(now - 60000) };
  const checkpoint = {
    syncedAt: new Date(now - 50000),
    videoCoverageComplete: false,
  };
  assert.equal(canResumeAfterDaily(previous, checkpoint, now), true);
  assert.equal(
    canResumeAfterDaily({ ...previous, status: "success" }, checkpoint, now),
    false,
  );
  assert.equal(
    canResumeAfterDaily(
      previous,
      { ...checkpoint, videoCoverageComplete: true },
      now,
    ),
    false,
  );
  assert.equal(
    canResumeAfterDaily(
      previous,
      { ...checkpoint, syncedAt: new Date(now - 120000) },
      now,
    ),
    false,
  );
  assert.equal(
    canResumeAfterDaily(
      previous,
      { ...checkpoint, syncedAt: new Date(now - 7200000) },
      now,
    ),
    false,
  );
  assert.equal(canResumeAfterDaily(previous, null, now), false);
});

test("ambiguous city rows retain all raw metrics without summing or silently dropping records", async () => {
  const { preserveGeographyRows } = await import(
    "../src/features/admin/data/geography-rows.ts"
  );
  const rows = [
    { location: "Same city (US)", views: 10, duration: null },
    { location: "Same city (US)", views: 20, duration: 50 },
    { location: "Other (JP)", views: 30, duration: 60 },
  ];
  const stored = preserveGeographyRows(rows, "2026-09-27", "2026-10-24");
  assert.equal(stored.length, 3);
  assert.equal(new Set(stored.map((row) => row.location)).size, 3);
  assert.deepEqual(
    stored.map((row) => row.views),
    [10, 20, 30],
  );
  assert.equal(stored[0].duration, null);
  assert.equal(stored[2].location, "Other (JP)");
  assert.deepEqual(
    rows.map((row) => row.location),
    ["Same city (US)", "Same city (US)", "Other (JP)"],
  );
});
test("ambiguous estimated city labels never invent cross-period growth identities", async () => {
  const { preserveGeographyRows } = await import(
    "../src/features/admin/data/geography-rows.ts"
  );
  const rows = [{ location: "Same city (US)" }, { location: "Same city (US)" }];
  const current = preserveGeographyRows(rows, "2026-09-27", "2026-10-24");
  const prior = preserveGeographyRows(rows, "2026-08-30", "2026-09-26");
  assert.ok(
    current.every(
      (row) => !prior.some((previous) => previous.location === row.location),
    ),
  );
});
