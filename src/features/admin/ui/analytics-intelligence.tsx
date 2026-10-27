import Link from "next/link";
import {
  type CohortKind,
  type EarlyRow,
  getAudienceIntelligence,
  getChannelIntelligence,
  getContentStrategy,
  getPublishAgeIntelligence,
} from "../data/analytics-intelligence";
import { isCompletePublishWindow } from "../data/analytics-math";
import { listAdminMusicWorks } from "../data/music-admin";
import {
  getSongCandidateIntelligence,
  type SongCandidateInput,
} from "../data/song-candidate-intelligence";
import {
  listLatestYoutubeEarlyPerformanceSnapshots,
  listYoutubeAnalyticsSyncHistory,
  listYoutubeRetentionSnapshots,
  listYoutubeTrafficSourceSnapshotsByPeriods,
} from "../data/youtube-analytics";

const PANEL =
  "rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-100 md:p-6";
const CONTROL =
  "min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100";
const CELL =
  "whitespace-nowrap border-b border-zinc-800 px-3 py-2 text-left text-sm";
function number(value: number | null | undefined, digits = 0) {
  return value == null
    ? "—"
    : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
function percent(value: number | null | undefined) {
  return value == null ? "—" : `${number(value, 1)}%`;
}
function signed(value: number | null | undefined) {
  return value == null ? "—" : `${value > 0 ? "+" : ""}${number(value, 1)}`;
}
function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-6 text-zinc-400">{children}</p>;
}

export async function ChannelTrends({
  days,
  start,
  end,
}: {
  days?: number;
  start?: string;
  end?: string;
}) {
  let data: Awaited<ReturnType<typeof getChannelIntelligence>>;
  try {
    data = await getChannelIntelligence({ days, start, end });
  } catch {
    return (
      <section className={PANEL}>
        <h2>Daily trends unavailable</h2>
        <Note>
          Choose a valid range of up to 365 completed Pacific calendar days.
          Apply the Analytics Intelligence migration before the first sync.
        </Note>
        <Link href="/admin/analytics" className="underline">
          Reset range
        </Link>
      </section>
    );
  }
  if (!data) return null;
  const cards = [
    ["Views", data.changes.views],
    ["Watch minutes", data.changes.watchMinutes],
    ["Subscribers gained", data.changes.gained],
    ["Subscribers lost", data.changes.lost],
    ["Net subscribers", data.changes.netSubscribers],
  ] as const;
  const maxViews = Math.max(
    1,
    ...data.daily.map((row) => row.metrics?.views ?? 0),
  );
  return (
    <section className={`${PANEL} space-y-5`}>
      <div>
        <h2 className="text-xl font-semibold">Channel daily trends</h2>
        <Note>
          {data.start} – {data.end} vs {data.previous.start} –{" "}
          {data.previous.end} · {data.timezone} · YouTube Analytics API
        </Note>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        action="/admin/analytics"
      >
        <label className="grid gap-1 text-xs">
          Range
          <select name="days" defaultValue={days ?? 28} className={CONTROL}>
            {[7, 28, 90, 365].map((value) => (
              <option value={value} key={value}>
                {value} days
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Custom start
          <input
            type="date"
            name="start"
            defaultValue={start}
            className={CONTROL}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Custom end
          <input
            type="date"
            name="end"
            defaultValue={end}
            className={CONTROL}
          />
        </label>
        <button className={CONTROL} type="submit">
          Compare periods
        </button>
      </form>
      <Note>
        Coverage: {data.current.availableDays}/{data.current.expectedDays}{" "}
        selected days; {data.prior.availableDays}/{data.prior.expectedDays}{" "}
        previous days. {data.stale ? "Cache is stale or not yet synced. " : ""}
        Synced {data.syncedAt ?? "never"}. Period totals remain unknown if any
        day is missing.
      </Note>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, change]) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
          >
            <div className="text-xs text-zinc-400">{label}</div>
            <div className="mt-1 text-2xl">{number(change.current)}</div>
            <Note>
              {signed(change.delta)} / {percent(change.percent)} vs{" "}
              {number(change.previous)}
            </Note>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div
          className="flex h-32 min-w-[500px] items-end gap-px"
          role="img"
          aria-label="Daily channel views; missing days have an outlined bar"
        >
          {data.daily.map((row) => (
            <div
              key={row.date}
              className={`min-w-[2px] flex-1 ${row.metrics ? "bg-zinc-400" : "border border-zinc-600"}`}
              style={{
                height: row.metrics
                  ? `${Math.max(1, (row.metrics.views / maxViews) * 100)}%`
                  : "100%",
              }}
              title={`${row.date}: ${number(row.metrics?.views)} views`}
            />
          ))}
        </div>
        <Note>
          {data.start} → {data.end} · daily views
        </Note>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <h3>New releases change</h3>
          <p className="text-xl">
            {signed(data.breakdown.newReleasesDelta)} views
          </p>
        </div>
        <div>
          <h3>Back catalog change</h3>
          <p className="text-xl">
            {signed(data.breakdown.backCatalogDelta)} views
          </p>
        </div>
        <div>
          <h3>Untracked residual change</h3>
          <p className="text-xl">
            {signed(data.breakdown.untrackedResidualDelta)} views
          </p>
        </div>
      </div>
      <Note>
        {data.breakdown.available
          ? data.breakdown.note
          : "Attribution unavailable until every day of both periods has a complete tracked-video report."}{" "}
        Top 10 tracked videos / all channel views:{" "}
        {percent(
          data.breakdown.top10Share === null
            ? null
            : data.breakdown.top10Share * 100,
        )}
        . Published works: {data.current.published} vs {data.prior.published}{" "}
        (catalog coverage).
      </Note>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          ["Top gainers", data.topGainers],
          ["Top decliners", data.topDecliners],
        ].map(([label, items]) => (
          <div key={String(label)}>
            <h3 className="mb-2 font-medium">{String(label)}</h3>
            {typeof items !== "string" &&
              items.map((row) => (
                <div
                  key={row.contentId}
                  className="flex justify-between gap-3 border-b border-zinc-800 py-2 text-sm"
                >
                  <Link
                    className="min-w-0 truncate underline"
                    href={`/admin/analytics/works/${encodeURIComponent(row.contentId)}`}
                  >
                    {row.title}
                  </Link>
                  <span className="shrink-0">{signed(row.delta)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
      <SyncHistory />
      <details>
        <summary className="cursor-pointer text-sm">
          Daily metrics and provenance
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Pacific date",
                  "Views",
                  "Watch min",
                  "Gained",
                  "Lost",
                  "Net",
                  "AVD (s)",
                  "Avg viewed %",
                  "Tracked impressions",
                  "Tracked CTR %",
                  "Published",
                ].map((label) => (
                  <th className={CELL} key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.daily.map((row) => (
                <tr key={row.date}>
                  {[
                    row.date,
                    number(row.metrics?.views),
                    number(row.metrics?.estimatedMinutesWatched, 1),
                    number(row.metrics?.subscribersGained),
                    number(row.metrics?.subscribersLost),
                    number(
                      row.metrics
                        ? row.metrics.subscribersGained -
                            row.metrics.subscribersLost
                        : null,
                    ),
                    number(row.metrics?.averageViewDuration, 1),
                    percent(row.metrics?.averageViewPercentage),
                    number(row.trackedImpressions),
                    percent(
                      row.trackedCtr === null ? null : row.trackedCtr * 100,
                    ),
                    number(row.published),
                  ].map((value, index) => (
                    <td
                      className={CELL}
                      key={
                        [
                          "date",
                          "views",
                          "watch",
                          "gained",
                          "lost",
                          "net",
                          "duration",
                          "percentage",
                          "reach",
                          "ctr",
                          "published",
                        ][index]
                      }
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.limitations.map((note) => (
          <Note key={note}>{note}</Note>
        ))}
      </details>
    </section>
  );
}

export async function PublishAgePanel({
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
  const data = await getPublishAgeIntelligence({
    id,
    hours,
    limit,
    cohort,
    matchDuration,
  });
  if (!data) return null;
  return (
    <section className={`${PANEL} space-y-4`}>
      <h2 className="text-xl font-semibold">
        Same-age performance and diagnosis
      </h2>
      <form className="flex flex-wrap gap-2">
        <select
          aria-label="Publish-date window"
          name="hours"
          defaultValue={hours}
          className={CONTROL}
        >
          {[24, 72, 168, 672].map((value) => (
            <option value={value} key={value}>
              Publish-date {value / 24} day(s)
            </option>
          ))}
        </select>
        <select
          aria-label="Cohort size"
          name="limit"
          defaultValue={limit}
          className={CONTROL}
        >
          {[10, 20, 50].map((value) => (
            <option value={value} key={value}>
              Recent {value} peers
            </option>
          ))}
        </select>
        <select
          aria-label="Cohort group"
          name="cohort"
          defaultValue={cohort}
          className={CONTROL}
        >
          {[
            ["recent", "Recent uploads"],
            ["sameSourceIp", "Same IP / series"],
            ["sameSourceType", "Same source type"],
            ["sameStyle", "Same work type"],
            ["sameLanguage", "Same metadata language"],
            ["sameVocalLanguage", "Same vocal language set"],
            ["similarDuration", "Similar duration"],
          ].map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            name="matchDuration"
            type="checkbox"
            value="1"
            defaultChecked={matchDuration}
          />
          Also match duration band
        </label>
        <button type="submit" className={CONTROL}>
          Compare
        </button>
      </form>
      <Note>
        {data.label} · {data.timezone} · Vocal language: {data.vocalLanguage} ·
        Duration: {data.durationBand}.{" "}
        {data.target
          ? `${data.target.startDate} – ${data.target.endDate} · synced ${data.target.syncedAt.toISOString()}`
          : "Not Available: selected window is missing, unfinished, or unverified."}
      </Note>
      {data.ranking && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Rank including target",
                `${data.ranking.rank ?? "—"} / ${data.ranking.sampleSize + 1}`,
              ],
              ["Peer median views", number(data.ranking.cohortMedian)],
              [
                "Difference vs median",
                `${signed(data.ranking.differenceVsMedian.delta)} / ${percent(data.ranking.differenceVsMedian.percent)}`,
              ],
              [
                "Difference vs best",
                `${signed(data.ranking.differenceVsBest.delta)} / ${percent(data.ranking.differenceVsBest.percent)}`,
              ],
              [
                "Net subscribers / 1,000 views",
                number(data.ranking.netSubscribersPer1000Views, 2),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <Note>{label}</Note>
                <p>{value}</p>
              </div>
            ))}
          </div>
          <Note>
            {data.ranking.sampleWarning} Available peers: {data.peers.length}/
            {data.requestedPeers}; missing or unfinished: {data.missingPeers}.
          </Note>
        </>
      )}
      {data.target && <WindowEvidence target={data.target} />}
      {data.diagnosis && (
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <h3>Diagnosis: {data.diagnosis.status}</h3>
          {data.diagnosis.hypotheses.map((text) => (
            <p className="text-sm text-zinc-300" key={text}>
              {text}
            </p>
          ))}
          <Note>{data.diagnosis.limitation}</Note>
          <details>
            <summary className="cursor-pointer text-sm">
              Audit evidence and baseline
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto text-xs text-zinc-400">
              {JSON.stringify(data.diagnosis.evidence, null, 2)}
            </pre>
          </details>
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-sm">
          Peer values and limitations
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Work",
                  "Views",
                  "Impressions",
                  "CTR %",
                  "Avg viewed %",
                  "Net subs",
                ].map((label) => (
                  <th key={label} className={CELL}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.peers.map((row) => (
                <tr key={row.contentId}>
                  <td className={CELL}>
                    <Link
                      className="underline"
                      href={`/admin/analytics/works/${encodeURIComponent(row.contentId)}?hours=${hours}`}
                    >
                      {row.title}
                    </Link>
                  </td>
                  {[
                    number(row.views),
                    number(row.impressions),
                    percent(
                      row.impressionClickThroughRate === null
                        ? null
                        : row.impressionClickThroughRate * 100,
                    ),
                    percent(row.averageViewPercentage),
                    number(row.subscribersGained - row.subscribersLost),
                  ].map((value, index) => (
                    <td
                      className={CELL}
                      key={
                        ["views", "reach", "ctr", "percentage", "net"][index]
                      }
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.limitations.map((note) => (
          <Note key={note}>{note}</Note>
        ))}
      </details>
      <Note>Precise first 1h / 3h / 6h: Not Available. {data.hourly.note}</Note>
    </section>
  );
}

export async function StrategyPanel({
  hours = 168,
  query,
  candidate,
}: {
  hours?: number;
  query?: string;
  candidate?: SongCandidateInput;
}) {
  const data = await getContentStrategy(hours);
  return (
    <div className="space-y-5">
      <section className={`${PANEL} space-y-3`}>
        <h2 className="text-xl font-semibold">Content strategy</h2>
        <Note>
          {data.label} · median-based comparisons. Recent views:{" "}
          {data.period?.start} – {data.period?.end}.
        </Note>
        <form className="flex flex-wrap gap-2">
          <select
            aria-label="Same-age window"
            className={CONTROL}
            name="hours"
            defaultValue={hours}
          >
            {[24, 72, 168, 672].map((value) => (
              <option value={value} key={value}>
                Publish-date {value / 24} day(s)
              </option>
            ))}
          </select>
          <button className={CONTROL} type="submit">
            Update groups
          </button>
        </form>
        {data.limitations.map((note) => (
          <Note key={note}>{note}</Note>
        ))}
      </section>
      {[
        ["IP / series", data.ip],
        ["Source type", data.sourceType],
        ["Work type", data.workType],
        ["Metadata language", data.metadataLanguage],
        ["Vocal language", data.vocalLanguage],
        ["Video duration", data.duration],
      ].map(([label, groups]) => (
        <section className={PANEL} key={String(label)}>
          <h3 className="mb-3 font-semibold">{String(label)}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {[
                    "Group",
                    "Measured / works",
                    "Median views",
                    "Same-age views",
                    "Median CTR %",
                    "Weighted CTR %",
                    "Median viewed %",
                    "Watch min",
                    "Net subs",
                    "Net / 1k views",
                    "Recent 28d views",
                  ].map((text) => (
                    <th key={text} className={CELL}>
                      {text}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {typeof groups !== "string" &&
                  groups.map((row) => (
                    <tr key={row.name}>
                      <td className={CELL}>
                        {row.name}
                        {row.sampleWarning && <Note>{row.sampleWarning}</Note>}
                      </td>
                      <td className={CELL}>
                        {row.measuredWorks} / {row.workCount}
                      </td>
                      {[
                        number(row.medianViews),
                        number(row.sameAgeViews),
                        percent(
                          row.medianCtr === null ? null : row.medianCtr * 100,
                        ),
                        percent(
                          row.weightedCtr === null
                            ? null
                            : row.weightedCtr * 100,
                        ),
                        percent(row.medianViewPercentage),
                        number(row.watchMinutes, 1),
                        number(row.netSubscribers),
                        number(row.netSubscribersPer1000Views, 2),
                        number(row.recent28DayViews),
                      ].map((value, index) => (
                        <td
                          className={CELL}
                          key={
                            [
                              "medianViews",
                              "sameAgeViews",
                              "medianCtr",
                              "weightedCtr",
                              "viewed",
                              "watch",
                              "net",
                              "conversion",
                              "recent",
                            ][index]
                          }
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <details className="mt-3">
            <summary>View distributions</summary>
            <pre className="max-h-64 overflow-auto text-xs">
              {JSON.stringify(
                typeof groups === "string"
                  ? []
                  : groups.map((row) => ({
                      group: row.name,
                      views: row.distribution,
                    })),
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      ))}
      <section className={PANEL}>
        <h3 className="mb-3 font-semibold">Evergreen works</h3>
        <Note>
          At least 30 days old at the start of the measured 28-day period.
          Ranked by daily views.
        </Note>
        {data.evergreen.map((row) => (
          <div
            className="flex flex-wrap justify-between gap-2 border-b border-zinc-800 py-2 text-sm"
            key={row.contentId}
          >
            <Link
              href={`/admin/analytics/works/${encodeURIComponent(row.contentId)}`}
              className="underline"
            >
              {row.title}
            </Link>
            <span>
              {number(row.dailyViews, 1)} views/day ·{" "}
              {number(row.netSubscribersPer1000Views, 2)} net subs/1k
            </span>
          </div>
        ))}
        {!data.evergreen.length && (
          <Note>No eligible works with a complete measured period.</Note>
        )}
      </section>
      <section className={`${PANEL} space-y-3`}>
        <SongCandidatePanel
          input={candidate ?? { title: query ?? "" }}
          hours={hours}
        />
      </section>
    </div>
  );
}

export async function AudiencePanel() {
  const data = await getAudienceIntelligence();
  if (!data) return null;
  return (
    <section className={`${PANEL} space-y-4`}>
      <h2 className="text-xl font-semibold">Audience geography</h2>
      {data.available && (
        <Note>
          {data.start} – {data.end} · {data.timezone} · {data.source} · synced{" "}
          {data.syncedAt}
        </Note>
      )}
      <Note>{data.note}</Note>
      {data.available &&
        ["country", "city"].map((dimension) => (
          <div key={dimension}>
            <h3 className="mb-2 capitalize">{dimension}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {[
                      "Location",
                      "Views",
                      "Channel share %",
                      "Watch min",
                      "AVD (s)",
                      "Avg viewed %",
                      "Subs gained",
                      "Change vs previous 28d",
                    ].map((label) => (
                      <th key={label} className={CELL}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items
                    .filter((row) => row.dimension === dimension)
                    .map((row) => (
                      <tr key={row.id}>
                        {[
                          row.location,
                          number(row.views),
                          percent(row.share === null ? null : row.share * 100),
                          number(row.estimatedMinutesWatched, 1),
                          number(row.averageViewDuration, 1),
                          percent(row.averageViewPercentage),
                          number(row.subscribersGained),
                          `${signed(row.growth.delta)} / ${percent(row.growth.percent)}`,
                        ].map((value, index) => (
                          <td
                            className={CELL}
                            key={
                              [
                                "location",
                                "views",
                                "share",
                                "watch",
                                "duration",
                                "viewed",
                                "gained",
                                "change",
                              ][index]
                            }
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </section>
  );
}

export async function GrowthCurves({
  ids = [],
  metric = "views",
}: {
  ids?: string[];
  metric?: string;
}) {
  const [works, snapshots] = await Promise.all([
    listAdminMusicWorks(),
    listLatestYoutubeEarlyPerformanceSnapshots(),
  ]);
  const selected = [...new Set(ids)].slice(0, 5);
  const keys = [
    "views",
    "estimatedMinutesWatched",
    "likes",
    "subscribersGained",
  ] as const;
  const field = keys.find((key) => key === metric) ?? "views";
  const windows = [24, 72, 168, 672];
  const series = selected.map((id) => ({
    work: works.find((work) => work.contentId === id),
    rows: snapshots.filter(
      (row) =>
        row.contentId === id &&
        row.videoId === works.find((work) => work.contentId === id)?.u2bId &&
        isCompletePublishWindow(row),
    ),
  }));
  const max = Math.max(
    1,
    ...series.flatMap((item) => item.rows.map((row) => row[field] ?? 0)),
  );
  const colors = ["#e4e4e7", "#38bdf8", "#fbbf24", "#a78bfa", "#34d399"];
  return (
    <section className={`${PANEL} space-y-4`}>
      <h2 className="text-xl font-semibold">Same-age growth curves</h2>
      <Note>
        Choose 2–5 works. X: publish-date window days, spaced by actual day
        count; Y: {field}. Only verified completed windows appear. Missing
        points remain absent.
      </Note>
      <form className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <select
              name="ids"
              key={index}
              defaultValue={selected[index] ?? ""}
              className={CONTROL}
              aria-label={`Work ${index + 1}`}
            >
              <option value="">Select work {index + 1}</option>
              {works
                .filter((work) => work.u2bId)
                .map((work) => (
                  <option value={work.contentId} key={work.contentId}>
                    {work.songTitle || work.title}
                  </option>
                ))}
            </select>
          ))}
        </div>
        <select
          name="metric"
          className={CONTROL}
          defaultValue={field}
          aria-label="Growth metric"
        >
          {keys.map((key) => (
            <option value={key} key={key}>
              {key}
            </option>
          ))}
        </select>
        <button type="submit" className={`${CONTROL} ml-2`}>
          Draw curves
        </button>
      </form>
      {selected.length >= 2 && (
        <>
          <svg
            role="img"
            aria-label={`Same-age ${field} comparison`}
            viewBox="0 0 800 300"
            className="w-full"
          >
            <title>Completed publish-date windows</title>
            <text x="20" y="20" fill="#a1a1aa" fontSize="12">
              {number(max)} {field}
            </text>
            <line x1="50" y1="250" x2="760" y2="250" stroke="#52525b" />
            {windows.map((hours) => (
              <text
                key={hours}
                x={50 + ((hours / 24 - 1) / 27) * 700}
                y="278"
                fill="#a1a1aa"
                fontSize="12"
              >
                {hours / 24}d
              </text>
            ))}
            {series.map((item, index) => (
              <g key={selected[index]}>
                {windows.map((hours) => {
                  const row = item.rows.find(
                    (row) => row.elapsedHours === hours,
                  );
                  const value = row?.[field];
                  return value == null ? null : (
                    <circle
                      key={hours}
                      cx={50 + ((hours / 24 - 1) / 27) * 700}
                      cy={250 - (value / max) * 210}
                      r="5"
                      fill={colors[index]}
                    >
                      <title>
                        {item.work?.title}: {hours / 24}d = {number(value)}
                      </title>
                    </circle>
                  );
                })}
                {windows.slice(1).map((hours, i) => {
                  const before = item.rows.find(
                    (row) => row.elapsedHours === windows[i],
                  )?.[field];
                  const after = item.rows.find(
                    (row) => row.elapsedHours === hours,
                  )?.[field];
                  return before == null || after == null ? null : (
                    <line
                      key={hours}
                      x1={50 + ((windows[i] / 24 - 1) / 27) * 700}
                      y1={250 - (before / max) * 210}
                      x2={50 + ((hours / 24 - 1) / 27) * 700}
                      y2={250 - (after / max) * 210}
                      stroke={colors[index]}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
          <div className="space-y-2">
            {series.map((item, index) => (
              <div
                key={selected[index]}
                style={{ color: colors[index] }}
                className="text-sm"
              >
                {item.work?.songTitle || item.work?.title || selected[index]}:{" "}
                {windows
                  .map(
                    (hours) =>
                      `${hours / 24}d ${number(item.rows.find((row) => row.elapsedHours === hours)?.[field])}`,
                  )
                  .join(" · ")}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

async function WindowEvidence({ target }: { target: EarlyRow }) {
  const [retention, traffic] = await Promise.all([
    listYoutubeRetentionSnapshots(target.contentId, target.elapsedHours),
    listYoutubeTrafficSourceSnapshotsByPeriods(
      [target.elapsedHours / 24],
      [target.contentId],
    ),
  ]);
  const curve = retention.filter(
    (row) =>
      row.videoId === target.videoId &&
      row.startDate === target.startDate &&
      row.endDate === target.endDate,
  );
  const sources = traffic.filter(
    (row) =>
      row.videoId === target.videoId &&
      row.startDate === target.startDate &&
      row.endDate === target.endDate,
  );
  const max = Math.max(1, ...curve.map((row) => row.audienceWatchRatio));
  const points = curve
    .map(
      (row) =>
        `${40 + row.elapsedVideoTimePercent * 7},${190 - (row.audienceWatchRatio / max) * 160}`,
    )
    .join(" ");
  return (
    <details className="space-y-3">
      <summary className="cursor-pointer text-sm">
        Same-window engagement, retention and traffic
      </summary>
      <Note>
        {target.startDate} – {target.endDate} · API average duration{" "}
        {number(target.averageViewDuration, 1)} seconds · average viewed{" "}
        {percent(target.averageViewPercentage)} · watch{" "}
        {number(target.estimatedMinutesWatched, 1)} minutes · likes{" "}
        {number(target.likes)} · comments {number(target.comments)} · shares{" "}
        {number(target.shares)} · subscribers +
        {number(target.subscribersGained)} / −{number(target.subscribersLost)}
      </Note>
      {curve.length ? (
        <svg
          role="img"
          aria-label="Audience watch ratio by video progress"
          viewBox="0 0 800 225"
          className="w-full"
        >
          <title>Audience retention: actual API samples</title>
          <text x="40" y="18" fill="#a1a1aa" fontSize="12">
            Audience watch ratio (peak {number(max, 2)})
          </text>
          <line x1="40" y1="190" x2="740" y2="190" stroke="#52525b" />
          <polyline
            points={points}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <text x="40" y="215" fill="#a1a1aa" fontSize="12">
            0% video progress
          </text>
          <text x="630" y="215" fill="#a1a1aa" fontSize="12">
            100% progress
          </text>
        </svg>
      ) : (
        <Note>Retention curve: Not Available for this window.</Note>
      )}
      <Note>
        Audience watch ratio can exceed 1 due to repeated viewing; it is not
        returning-viewer retention. Traffic rows may be privacy-limited and need
        not sum to all views.
      </Note>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={CELL}>Traffic source (API code)</th>
              <th className={CELL}>Views</th>
              <th className={CELL}>Share of window views</th>
              <th className={CELL}>Watch minutes</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((row) => (
              <tr key={row.id}>
                <td className={CELL}>{row.sourceType}</td>
                <td className={CELL}>{number(row.views)}</td>
                <td className={CELL}>
                  {percent(
                    target.views ? (row.views / target.views) * 100 : null,
                  )}
                </td>
                <td className={CELL}>
                  {number(row.estimatedMinutesWatched, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!sources.length && (
        <Note>Traffic sources: Not Available for this window.</Note>
      )}
    </details>
  );
}

async function SyncHistory() {
  const runs = await listYoutubeAnalyticsSyncHistory();
  return (
    <details>
      <summary className="cursor-pointer text-sm">Recent sync runs</summary>
      <div className="space-y-3 pt-3">
        {runs.map((run) => (
          <div className="border-b border-zinc-800 pb-3" key={run.id}>
            <p className="text-sm">
              {run.status} · {run.startedAt.toISOString()} →{" "}
              {run.syncedAt?.toISOString() ?? "unfinished"}
            </p>
            <Note>
              {run.startDate} – {run.endDate} · {run.videoCount} works ·{" "}
              {run.message}
            </Note>
          </div>
        ))}
        {!runs.length && (
          <Note>Run history starts with the next authorized sync.</Note>
        )}
      </div>
    </details>
  );
}

async function SongCandidatePanel({
  input,
  hours,
}: {
  input: SongCandidateInput;
  hours: number;
}) {
  let result: Awaited<ReturnType<typeof getSongCandidateIntelligence>> | null =
    null;
  let error: string | null = null;
  if (input.title.trim()) {
    try {
      result = await getSongCandidateIntelligence({ ...input, hours });
    } catch (caught) {
      error =
        caught instanceof Error
          ? caught.message
          : "Candidate analysis unavailable.";
    }
  }
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Song candidate intelligence</h3>
      <form className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="hours" value={hours} />
        {[
          {
            name: "candidateTitle",
            label: "Candidate title",
            value: input.title,
            required: true,
          },
          {
            name: "sourceTitle",
            label: "Original source title",
            value: input.sourceTitle,
          },
          { name: "artist", label: "Original artist", value: input.artist },
          { name: "ip", label: "Source IP", value: input.ip },
          { name: "series", label: "Source series", value: input.series },
          {
            name: "vocalLanguages",
            label: "Planned vocal language codes (e.g. ru, ja)",
            value: input.vocalLanguages,
          },
          {
            name: "durationSeconds",
            label: "Planned duration in whole seconds",
            value: input.durationSeconds,
          },
        ].map((field) => (
          <label className="grid gap-1 text-sm" key={field.name}>
            {field.label}
            <input
              className={CONTROL}
              name={field.name}
              defaultValue={field.value}
              maxLength={200}
              required={field.required}
              type={field.name === "durationSeconds" ? "number" : "text"}
            />
          </label>
        ))}
        <label className="grid gap-1 text-sm">
          Planned work type
          <select
            name="workType"
            className={CONTROL}
            defaultValue={input.workType ?? ""}
          >
            <option value="">Unknown</option>
            {[
              ["O", "Original"],
              ["CO", "Concept Original"],
              ["C", "Cover"],
              ["LC", "Lyric Rework Cover"],
              ["R", "Reimagining"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowRemake"
            value="1"
            defaultChecked={input.allowRemake}
          />
          Explicitly evaluate a remake / alternate version
        </label>
        <button className={CONTROL} type="submit">
          Check duplicates and score
        </button>
      </form>
      <Note>
        Temporary planning inputs. They do not change the catalog. Exact
        existing sources are excluded by default. No match is not proof that a
        song is unproduced. Language describes the planned vocals;
        metadata/subtitle languages are not used.
      </Note>
      {error && (
        <p role="alert" className="text-sm text-amber-300">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="flex flex-wrap gap-6">
            <div>
              <Note>Rule score (0–100)</Note>
              <p className="text-3xl">{number(result.score, 1)}</p>
            </div>
            <div>
              <Note>Status / confidence</Note>
              <p>
                {result.status} / {result.confidence}
              </p>
            </div>
            <div>
              <Note>Evidence weight coverage</Note>
              <p>
                {number(result.evidenceCoveragePercent)}% (requires{" "}
                {result.minimumEvidenceCoveragePercent}%)
              </p>
            </div>
            <div>
              <Note>Existing source/version matches</Note>
              <p>
                {result.exactMatches} · remake penalty {result.remakePenalty}
              </p>
            </div>
          </div>
          <Note>
            {result.label} · {result.timezone}. Baseline measured works:{" "}
            {result.baseline.measuredWorks}; missing/uncompleted:{" "}
            {result.baseline.missingWorks}.
          </Note>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {[
                    "Component",
                    "Weight",
                    "Measured sample",
                    "Baseline sample",
                    "Cohort median",
                    "Percentile",
                  ].map((label) => (
                    <th key={label} className={CELL}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.components.map((component) => (
                  <tr key={component.key}>
                    <td className={CELL}>{component.label}</td>
                    <td className={CELL}>{component.weight}%</td>
                    <td className={CELL}>{component.sampleSize}</td>
                    <td className={CELL}>{component.baselineSize}</td>
                    <td className={CELL}>{number(component.median, 2)}</td>
                    <td className={CELL}>{number(component.percentile, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>{result.formula}</Note>
          {result.duplicate.exactSources.map((work) => (
            <div className="text-sm" key={work.contentId}>
              <Link
                className="underline"
                href={`/admin/content/${encodeURIComponent(work.contentId)}`}
              >
                {work.title}
              </Link>{" "}
              · {work.sourceTitle}
            </div>
          ))}
          {result.limitations.map((limitation) => (
            <Note key={limitation}>{limitation}</Note>
          ))}
          <details>
            <summary className="cursor-pointer text-sm">
              Audit samples and duplicate evidence
            </summary>
            <pre className="max-h-96 overflow-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
