import { BarChart3, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminAuthStatus, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  listAdminMusicWorks,
} from "../data/music-admin";
import {
  getYoutubeAnalyticsSyncStatus,
  listLatestYoutubeAnalyticsSnapshots,
  listLatestYoutubeEarlyPerformanceSnapshots,
  listYoutubeRealtimeSnapshots,
  listYoutubeReportingImports,
  listYoutubeRetentionSnapshots,
  listYoutubeTrafficSourceSnapshotsByPeriods,
} from "../data/youtube-analytics";
import {
  getAdminYoutubeCommentSyncStatus,
  listAdminYoutubeComments,
} from "../data/youtube-comments";
import {
  getAdminYoutubeConnection,
  getYoutubeOAuthConfig,
} from "../data/youtube-connection";
import { AdminActionToast } from "./admin-action-toast";
import { AdminLogin } from "./login-form";

const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";
const CARD_TITLE_CLASS = "text-zinc-100";
const CARD_DESCRIPTION_CLASS = "text-zinc-400";
const PRIMARY_BUTTON_CLASS =
  "border-zinc-100 bg-zinc-100 text-zinc-950 shadow-none hover:bg-white";
const SECONDARY_BUTTON_CLASS =
  "border-zinc-700 bg-zinc-900 text-zinc-100 shadow-none hover:bg-zinc-800";
const ANALYTICS_PAGE_SIZE = 50;
const ANALYTICS_SORTS = [
  "views",
  "watchTime",
  "likes",
  "comments",
  "avgViewed",
  "subs",
  "work",
] as const;
const SORT_ORDERS = ["asc", "desc"] as const;

type ActionStatus = "error" | "success";
type AnalyticsSort = (typeof ANALYTICS_SORTS)[number];
type SortOrder = (typeof SORT_ORDERS)[number];
type Snapshot = Awaited<
  ReturnType<typeof listLatestYoutubeAnalyticsSnapshots>
>[number];
type Work = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];
type EarlySnapshot = Awaited<
  ReturnType<typeof listLatestYoutubeEarlyPerformanceSnapshots>
>[number];
type RetentionSnapshot = Awaited<
  ReturnType<typeof listYoutubeRetentionSnapshots>
>[number];
type TrafficSnapshot = Awaited<
  ReturnType<typeof listYoutubeTrafficSourceSnapshotsByPeriods>
>[number];
type RealtimeSnapshot = Awaited<
  ReturnType<typeof listYoutubeRealtimeSnapshots>
>[number];
type YoutubeComment = Awaited<
  ReturnType<typeof listAdminYoutubeComments>
>["items"][number];
type AnalyticsRow = {
  snapshot: Snapshot;
  verdict: ReturnType<typeof getVerdict>;
  work: Work | undefined;
};
type ReleaseRow = {
  availableWindows: number[];
  early: EarlySnapshot | undefined;
  reachCoverage: ReturnType<typeof getReachCoverage>;
  retention: RetentionSnapshot[];
  topTraffic: TrafficSnapshot | undefined;
  velocity: ReturnType<typeof getReleaseVelocity>;
  verdict: ReturnType<typeof getReleaseVerdict>;
  work: Work;
};

function matchActionStatus(value?: string): ActionStatus {
  return value === "success" ? "success" : "error";
}

function matchAnalyticsSort(value?: string): AnalyticsSort {
  return ANALYTICS_SORTS.includes(value as AnalyticsSort)
    ? (value as AnalyticsSort)
    : "views";
}

function matchSortOrder(value?: string): SortOrder {
  return SORT_ORDERS.includes(value as SortOrder)
    ? (value as SortOrder)
    : "desc";
}

export async function AdminAnalyticsPage({
  message,
  order,
  page,
  q,
  sort,
  status,
}: {
  message?: string;
  order?: string;
  page?: string;
  q?: string;
  sort?: string;
  status?: string;
}) {
  return (
    <AdminAnalyticsFrame message={message} status={status}>
      {async ({ releaseRows, rows, syncStatus, youtubeConfig }) => (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Recent releases"
              value={formatInteger(releaseRows.length)}
            />
            <MetricCard
              label="With 7-day window"
              value={formatInteger(
                releaseRows.filter((row) => row.availableWindows.includes(168))
                  .length,
              )}
            />
            <MetricCard
              label="CTR coverage"
              value={formatCoverage(
                releaseRows.filter(
                  (row) => row.reachCoverage.status === "complete",
                ).length,
                releaseRows.length,
              )}
            />
            <MetricCard
              label="Retention coverage"
              value={formatCoverage(
                releaseRows.filter((row) => row.retention.length > 0).length,
                releaseRows.length,
              )}
            />
          </div>

          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className={CARD_TITLE_CLASS}>Launch Monitor</CardTitle>
              <CardDescription className={CARD_DESCRIPTION_CLASS}>
                Live observation deltas for releases from the last seven days.
                Values appear after at least two automated syncs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LaunchMonitorTable
                rows={releaseRows.filter(
                  (row) => getReleaseAgeHours(row.work) <= 168,
                )}
              />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className={CARD_TITLE_CLASS}>
                Recent Release Decisions
              </CardTitle>
              <CardDescription className={CARD_DESCRIPTION_CLASS}>
                Each work uses its latest completed publish window. Lifetime
                totals are kept only as historical context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentReleaseTable rows={releaseRows.slice(0, 12)} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <CardTitle className={CARD_TITLE_CLASS}>Current Sync</CardTitle>
                <CardDescription className={CARD_DESCRIPTION_CLASS}>
                  Last sync:{" "}
                  {syncStatus?.syncedAt
                    ? syncStatus.syncedAt.toLocaleString("en-US")
                    : "not synced yet"}
                  {syncStatus?.message ? ` · ${syncStatus.message}` : ""}
                </CardDescription>
              </div>
              <Button asChild className={SECONDARY_BUTTON_CLASS}>
                <Link href="/admin/analytics/works">Open Works</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <DiagnosisCard
                description="CTR comes from the daily Reach report and is weighted by impressions. Missing means the report is not generated yet."
                title="Packaging"
              />
              <DiagnosisCard
                description="Average viewed and the 10%/50%/end curve show whether viewers stay after clicking."
                title="Retention"
              />
              <DiagnosisCard
                description="Net subscribers and the leading traffic source distinguish audience growth from temporary external traffic."
                title="Audience quality"
              />
            </CardContent>
          </Card>

          <AnalyticsWorksCard
            basePath="/admin/analytics"
            order={order}
            page={page}
            q={q}
            rows={rows}
            sort={sort}
            title="All Works"
          />

          {!youtubeConfig.ok ? (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
              <AlertTitle>YouTube configuration incomplete</AlertTitle>
              <AlertDescription>
                Missing: {youtubeConfig.missing.join(", ")}
              </AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
    </AdminAnalyticsFrame>
  );
}

export async function AdminAnalyticsWorksPage({
  order,
  page,
  q,
  sort,
}: {
  order?: string;
  page?: string;
  q?: string;
  sort?: string;
}) {
  return (
    <AdminAnalyticsFrame>
      {async ({ rows }) => (
        <AnalyticsWorksCard
          basePath="/admin/analytics/works"
          order={order}
          page={page}
          q={q}
          rows={rows}
          sort={sort}
          title="Works"
        />
      )}
    </AdminAnalyticsFrame>
  );
}

export async function AdminAnalyticsCommentsPage({
  message,
  page,
  q,
  status,
}: {
  message?: string;
  page?: string;
  q?: string;
  status?: string;
}) {
  return (
    <AdminAnalyticsFrame message={message} status={status}>
      {async ({ works }) => {
        const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
        const query = q?.trim() ?? "";
        const offset = (currentPage - 1) * ANALYTICS_PAGE_SIZE;
        const [{ items, total }, syncStatus] = await Promise.all([
          listAdminYoutubeComments({
            limit: ANALYTICS_PAGE_SIZE,
            offset,
            q: query,
          }),
          getAdminYoutubeCommentSyncStatus(),
        ]);
        const totalPages = Math.max(1, Math.ceil(total / ANALYTICS_PAGE_SIZE));
        const workByContentId = new Map(
          works.map((work) => [work.contentId, work]),
        );

        return (
          <Card className={CARD_CLASS}>
            <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <CardTitle className={CARD_TITLE_CLASS}>
                  Audience Comments
                </CardTitle>
                <CardDescription className={CARD_DESCRIPTION_CLASS}>
                  {total} stored top-level comments. Latest sync:{" "}
                  {syncStatus?.syncedAt
                    ? syncStatus.syncedAt.toLocaleString("en-US")
                    : "not synced yet"}
                  {syncStatus?.message ? ` · ${syncStatus.message}` : ""}
                </CardDescription>
              </div>
              <form action="/admin/analytics/comments/sync" method="post">
                <Button className={PRIMARY_BUTTON_CLASS} type="submit">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync comments
                </Button>
              </form>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-5 text-sky-100">
                Quota policy: 1 unit per 100-comment page; incremental syncs
                stop after reaching the previous newest comment and are capped
                at 3 pages. Initial backfill is capped at 10 pages. Replies are
                counted but not fetched individually.
              </div>
              <form
                action="/admin/analytics/comments"
                className="flex flex-col gap-2 sm:flex-row"
                method="get"
              >
                <Input
                  aria-label="Search audience comments"
                  className="h-10 border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600"
                  defaultValue={query}
                  name="q"
                  placeholder="Search comment, viewer, or YouTube video ID"
                  type="search"
                />
                <Button className={PRIMARY_BUTTON_CLASS} type="submit">
                  Search
                </Button>
                {query ? (
                  <Button
                    asChild
                    className={SECONDARY_BUTTON_CLASS}
                    variant="outline"
                  >
                    <Link href="/admin/analytics/comments">Clear</Link>
                  </Button>
                ) : null}
              </form>
              <CommentsTable
                comments={items}
                workByContentId={workByContentId}
              />
              <CommentsPagination
                page={Math.min(currentPage, totalPages)}
                q={query}
                totalPages={totalPages}
              />
            </CardContent>
          </Card>
        );
      }}
    </AdminAnalyticsFrame>
  );
}

export async function AdminAnalyticsWorkDetailPage({ id }: { id: string }) {
  return (
    <AdminAnalyticsFrame>
      {async ({
        availableReachDates,
        earlySnapshots,
        periodSnapshots,
        retentionSnapshots,
        rows,
        trafficSnapshots,
      }) => {
        const row = rows.find(
          (item) =>
            item.snapshot.contentId === id ||
            item.snapshot.videoId === id ||
            item.work?.path === id,
        );

        if (!row) {
          return (
            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className={CARD_TITLE_CLASS}>Work Detail</CardTitle>
                <CardDescription className={CARD_DESCRIPTION_CLASS}>
                  No analytics snapshot was found for {id}.
                </CardDescription>
              </CardHeader>
            </Card>
          );
        }

        const comments = await listAdminYoutubeComments({
          contentId: row.snapshot.contentId,
          limit: 10,
        });

        return (
          <Card className={CARD_CLASS}>
            <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <CardTitle className={CARD_TITLE_CLASS}>
                  {getWorkTitle(row)}
                </CardTitle>
                <CardDescription className={CARD_DESCRIPTION_CLASS}>
                  {row.snapshot.videoId} · {row.verdict.description}
                </CardDescription>
              </div>
              <Button asChild className={SECONDARY_BUTTON_CLASS}>
                <Link
                  href={`/admin/content/${encodeURIComponent(row.snapshot.contentId)}?step=youtube`}
                >
                  Open Content
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-3 text-sm font-medium text-zinc-100">
                  Publish-window performance
                </div>
                <WindowPerformanceTable
                  earlySnapshots={earlySnapshots.filter(
                    (snapshot) => snapshot.contentId === row.snapshot.contentId,
                  )}
                  retentionSnapshots={retentionSnapshots.filter(
                    (snapshot) => snapshot.contentId === row.snapshot.contentId,
                  )}
                  availableReachDates={availableReachDates}
                  trafficSnapshots={trafficSnapshots.filter(
                    (snapshot) => snapshot.contentId === row.snapshot.contentId,
                  )}
                />
              </div>
              <div className="border-t border-zinc-800 pt-5">
                <div className="mb-3 text-sm font-medium text-zinc-100">
                  Historical performance
                </div>
                <PeriodPerformanceTable
                  snapshots={[
                    ...periodSnapshots.filter(
                      (snapshot) =>
                        snapshot.contentId === row.snapshot.contentId,
                    ),
                    row.snapshot,
                  ]}
                />
              </div>
              <div className="border-t border-zinc-800 pt-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-100">
                    Latest audience comments
                  </div>
                  <Link
                    className="text-xs text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
                    href={`/admin/analytics/comments?q=${encodeURIComponent(row.snapshot.videoId)}`}
                  >
                    View all {comments.total}
                  </Link>
                </div>
                <CommentsTable
                  comments={comments.items}
                  workByContentId={
                    new Map(row.work ? [[row.work.contentId, row.work]] : [])
                  }
                />
              </div>
              <div className="border-t border-zinc-800 pt-5">
                <div className="mb-3 text-sm font-medium text-zinc-100">
                  Traffic sources · latest 90d
                </div>
                <TrafficSourcesTable
                  snapshots={getLatestTrafficRows(
                    trafficSnapshots.filter(
                      (snapshot) =>
                        snapshot.contentId === row.snapshot.contentId &&
                        snapshot.periodDays === 90,
                    ),
                  )}
                />
              </div>
              <div className="border-t border-zinc-800 pt-5">
                <div className="mb-3 text-sm font-medium text-zinc-100">
                  Lifetime context
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard
                    label="Views"
                    value={formatInteger(row.snapshot.views)}
                  />
                  <MetricCard
                    label="Avg viewed"
                    value={formatPercent(row.snapshot.averageViewPercentage)}
                  />
                  <MetricCard
                    label="Watch time"
                    value={formatMinutes(row.snapshot.estimatedMinutesWatched)}
                  />
                  <MetricCard
                    label="Subs / 1k views"
                    value={formatNumber(
                      getSubscribersPer1000Views(row.snapshot),
                    )}
                  />
                </div>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <div className="text-sm font-medium text-zinc-100">Reading</div>
                <div className="mt-2">
                  <Badge className={row.verdict.className}>
                    {row.verdict.label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {row.verdict.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      }}
    </AdminAnalyticsFrame>
  );
}

export async function AdminAnalyticsComparePage() {
  return (
    <AdminAnalyticsFrame>
      {async ({ rows }) => {
        const groups = getVerdictGroups(rows);

        return (
          <div className="grid gap-5">
            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className={CARD_TITLE_CLASS}>Compare</CardTitle>
                <CardDescription className={CARD_DESCRIPTION_CLASS}>
                  First-pass matrix for packaging and retention diagnosis.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                {groups.map((group) => (
                  <div
                    className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
                    key={group.label}
                  >
                    <div className="text-sm font-medium text-zinc-100">
                      {group.label}
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-zinc-100">
                      {group.rows.length}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {group.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className={CARD_TITLE_CLASS}>
                  Top Comparison Rows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WorksTable
                  activeSort="views"
                  basePath="/admin/analytics/works"
                  order="desc"
                  query=""
                  rows={rows.slice(0, 10)}
                />
              </CardContent>
            </Card>
          </div>
        );
      }}
    </AdminAnalyticsFrame>
  );
}

async function AdminAnalyticsFrame({
  children,
  message,
  status,
}: {
  children: (
    data: Awaited<ReturnType<typeof loadAnalyticsData>>,
  ) => Promise<React.ReactNode>;
  message?: string;
  status?: string;
}) {
  const authStatus = getAdminAuthStatus();

  if (!authStatus.enabled) {
    return (
      <Alert className="border-zinc-700 bg-zinc-900 text-zinc-100">
        <BarChart3 className="mb-3 h-5 w-5 text-zinc-400" />
        <AlertTitle className="text-zinc-100">admin auth disabled</AlertTitle>
        <AlertDescription className="text-zinc-400">
          {authStatus.message}
          {authStatus.missing.length > 0
            ? ` Missing: ${authStatus.missing.join(", ")}.`
            : ""}
        </AlertDescription>
      </Alert>
    );
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminLogin mode={authStatus.mode} />;
  }

  const data = await loadAnalyticsData();

  return (
    <section className="space-y-5">
      <AnalyticsHeader databaseOk={data.databaseStatus.ok} />
      <AnalyticsNav />
      <AdminActionToast message={message} status={matchActionStatus(status)} />
      {!data.databaseStatus.ok ? (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-100">
          <AlertTitle>Database unavailable</AlertTitle>
          <AlertDescription>{data.databaseStatus.message}</AlertDescription>
        </Alert>
      ) : null}
      {!data.youtubeConnection ? (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
          <AlertTitle>YouTube is not connected</AlertTitle>
          <AlertDescription>
            Connect YouTube from the dashboard, then reconnect once to grant
            Analytics read access.
          </AlertDescription>
        </Alert>
      ) : null}
      {await children(data)}
    </section>
  );
}

function AnalyticsHeader({ databaseOk }: { databaseOk: boolean }) {
  const youtubeConfig = getYoutubeOAuthConfig();

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <BarChart3 className="h-4 w-4" />
            YouTube Analytics
          </div>
          <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
            Performance
          </CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            AI-ready diagnosis for packaging, retention, and Sovia audience
            growth.
          </CardDescription>
        </div>
        <form action="/admin/analytics/sync" method="post">
          <Button
            className={PRIMARY_BUTTON_CLASS}
            disabled={!databaseOk || !youtubeConfig.ok}
            type="submit"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync YouTube Analytics
          </Button>
        </form>
      </CardHeader>
    </Card>
  );
}

function AnalyticsNav() {
  const items = [
    ["Overview", "/admin/analytics"],
    ["Works", "/admin/analytics/works"],
    ["Comments", "/admin/analytics/comments"],
    ["Compare", "/admin/analytics/compare"],
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([label, href]) => (
        <Button
          asChild
          className={SECONDARY_BUTTON_CLASS}
          key={href}
          variant="outline"
        >
          <Link href={href}>{label}</Link>
        </Button>
      ))}
    </div>
  );
}

async function loadAnalyticsData() {
  const databaseStatus = await getAdminDatabaseStatus();
  const youtubeConfig = getYoutubeOAuthConfig();
  const [
    works,
    snapshots,
    periodSnapshots,
    earlySnapshots,
    retentionSnapshots,
    trafficSnapshots,
    realtimeSnapshots,
    reportingImports,
    syncStatus,
    youtubeConnection,
  ] = databaseStatus.ok
    ? await Promise.all([
        listAdminMusicWorks(),
        listLatestYoutubeAnalyticsSnapshots(),
        Promise.all(
          [7, 28, 90].map((periodDays) =>
            listLatestYoutubeAnalyticsSnapshots(periodDays),
          ),
        ).then((periods) => periods.flat()),
        listLatestYoutubeEarlyPerformanceSnapshots(),
        listYoutubeRetentionSnapshots(),
        listYoutubeTrafficSourceSnapshotsByPeriods([1, 3, 7, 28, 90]),
        listYoutubeRealtimeSnapshots({
          since: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        }),
        listYoutubeReportingImports(),
        getYoutubeAnalyticsSyncStatus(),
        getAdminYoutubeConnection(),
      ])
    : [[], [], [], [], [], [], [], [], null, null];
  const workByContentId = new Map(works.map((work) => [work.contentId, work]));
  const baseline = getBaseline(snapshots);
  const rows = snapshots.map((snapshot) => ({
    snapshot,
    work: workByContentId.get(snapshot.contentId),
    verdict: getVerdict(snapshot, baseline),
  }));
  const recentWorks = works
    .filter(
      (work) =>
        work.u2bId &&
        work.publishedAt &&
        Date.parse(work.publishedAt) >= Date.now() - 120 * 24 * 60 * 60 * 1000,
    )
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt ?? "") -
        Date.parse(left.publishedAt ?? ""),
    );
  const earlyByContentId = groupByContentId(earlySnapshots);
  const retentionByContentId = groupByContentId(retentionSnapshots);
  const trafficByContentId = groupByContentId(trafficSnapshots);
  const realtimeByContentId = groupByContentId(realtimeSnapshots);
  const availableReachDates = new Set(
    reportingImports.map((item) => item.startTime.toISOString().slice(0, 10)),
  );
  const releaseInputs = recentWorks.map((work) => {
    const completed = (earlyByContentId.get(work.contentId) ?? []).sort(
      (left, right) => right.elapsedHours - left.elapsedHours,
    );
    const early = completed[0];
    const retention = (retentionByContentId.get(work.contentId) ?? []).filter(
      (item) => item.elapsedHours === early?.elapsedHours,
    );
    const topTraffic = (trafficByContentId.get(work.contentId) ?? [])
      .filter((item) => item.periodDays === (early?.elapsedHours ?? 0) / 24)
      .sort((left, right) => right.views - left.views)[0];
    return {
      availableWindows: completed.map((item) => item.elapsedHours),
      early,
      reachCoverage: getReachCoverage(early, availableReachDates),
      retention,
      topTraffic,
      velocity: getReleaseVelocity(
        realtimeByContentId.get(work.contentId) ?? [],
      ),
      work,
    };
  });
  const releaseBaselines = new Map(
    [24, 72, 168, 672].map((elapsedHours) => [
      elapsedHours,
      getReleaseBaseline(
        earlySnapshots
          .filter((early) => early.elapsedHours === elapsedHours)
          .map((early) => ({
            early,
            reachCoverage: getReachCoverage(early, availableReachDates),
            retention: (retentionByContentId.get(early.contentId) ?? []).filter(
              (item) => item.elapsedHours === elapsedHours,
            ),
          })),
      ),
    ]),
  );
  const releaseRows: ReleaseRow[] = releaseInputs.map((row) => ({
    ...row,
    verdict: getReleaseVerdict(
      row,
      releaseBaselines.get(row.early?.elapsedHours ?? 0) ??
        getReleaseBaseline([]),
    ),
  }));

  return {
    baseline,
    availableReachDates,
    databaseStatus,
    earlySnapshots,
    periodSnapshots,
    rows,
    releaseRows,
    retentionSnapshots,
    snapshots,
    syncStatus,
    totals: getTotals(snapshots),
    trafficSnapshots,
    works,
    youtubeConfig,
    youtubeConnection,
  };
}

function RecentReleaseTable({ rows }: { rows: ReleaseRow[] }) {
  return (
    <div>
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="w-[18rem] text-zinc-400">Release</TableHead>
            <TableHead className="text-right text-zinc-400">Window</TableHead>
            <TableHead className="text-right text-zinc-400">Views</TableHead>
            <TableHead className="text-right text-zinc-400">
              Impressions
            </TableHead>
            <TableHead className="text-right text-zinc-400">CTR</TableHead>
            <TableHead className="text-right text-zinc-400">
              Reach coverage
            </TableHead>
            <TableHead className="text-right text-zinc-400">
              Avg viewed
            </TableHead>
            <TableHead className="text-right text-zinc-400">
              50% retention
            </TableHead>
            <TableHead className="text-right text-zinc-400">Net subs</TableHead>
            <TableHead className="w-36 text-zinc-400">Top source</TableHead>
            <TableHead className="w-48 text-zinc-400">Decision</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow className="border-zinc-800" key={row.work.contentId}>
              <TableCell className="align-top">
                <Link
                  className="block truncate font-medium text-zinc-100 underline-offset-4 hover:underline"
                  href={`/admin/analytics/${encodeURIComponent(row.work.contentId)}`}
                >
                  {getWorkDisplayTitle(row.work)}
                </Link>
                <div className="mt-1 text-xs text-zinc-500">
                  {formatDate(row.work.publishedAt)}
                </div>
              </TableCell>
              <TableCell className="text-right align-top text-zinc-300">
                {formatWindow(row.early?.elapsedHours)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatOptionalInteger(row.early?.views)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatOptionalInteger(row.early?.impressions)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatPercent(row.early?.impressionClickThroughRate)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-300">
                {formatReachCoverage(row.reachCoverage)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatPercent(row.early?.averageViewPercentage)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatRatioAsPercent(
                  getRetentionCheckpoint(row.retention, 50),
                )}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {row.early
                  ? formatSignedInteger(
                      row.early.subscribersGained - row.early.subscribersLost,
                    )
                  : "n/a"}
              </TableCell>
              <TableCell className="align-top text-xs text-zinc-400">
                {formatTrafficSource(row.topTraffic?.sourceType)}
              </TableCell>
              <TableCell className="align-top">
                <Badge className={row.verdict.className}>
                  {row.verdict.label}
                </Badge>
                <div className="mt-1 text-xs leading-5 text-zinc-500">
                  {row.verdict.description}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow className="border-zinc-800">
              <TableCell
                className="py-8 text-center text-zinc-500"
                colSpan={11}
              >
                No YouTube releases were published in the last 120 days.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function LaunchMonitorTable({ rows }: { rows: ReleaseRow[] }) {
  return (
    <div>
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="w-[18rem] text-zinc-400">Release</TableHead>
            <TableHead className="text-right text-zinc-400">Age</TableHead>
            <TableHead className="text-right text-zinc-400">
              Views now
            </TableHead>
            <TableHead className="text-right text-zinc-400">Last 1h</TableHead>
            <TableHead className="text-right text-zinc-400">Last 3h</TableHead>
            <TableHead className="text-right text-zinc-400">Last 24h</TableHead>
            <TableHead className="text-right text-zinc-400">Views/h</TableHead>
            <TableHead className="w-28 text-zinc-400">Trend</TableHead>
            <TableHead className="w-40 text-zinc-400">Observed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow className="border-zinc-800" key={row.work.contentId}>
              <TableCell>
                <Link
                  className="block truncate font-medium text-zinc-100 underline-offset-4 hover:underline"
                  href={`/admin/analytics/${encodeURIComponent(row.work.contentId)}`}
                >
                  {getWorkDisplayTitle(row.work)}
                </Link>
              </TableCell>
              <TableCell className="text-right text-zinc-300">
                {formatAge(getReleaseAgeHours(row.work))}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatOptionalInteger(row.velocity.latestViews)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatSignedOptionalInteger(row.velocity.delta1h)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatSignedOptionalInteger(row.velocity.delta3h)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatSignedOptionalInteger(row.velocity.delta24h)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatNumber(row.velocity.viewsPerHour3h)}
              </TableCell>
              <TableCell>
                <Badge className={getTrendClassName(row.velocity.trend)}>
                  {row.velocity.trend}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {row.velocity.observedAt
                  ? row.velocity.observedAt.toLocaleString("en-US")
                  : "waiting for sync"}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow className="border-zinc-800">
              <TableCell className="py-8 text-center text-zinc-500" colSpan={9}>
                No releases in the first seven days of launch.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function WindowPerformanceTable({
  availableReachDates,
  earlySnapshots,
  retentionSnapshots,
  trafficSnapshots,
}: {
  availableReachDates: Set<string>;
  earlySnapshots: EarlySnapshot[];
  retentionSnapshots: RetentionSnapshot[];
  trafficSnapshots: TrafficSnapshot[];
}) {
  const rows = [...earlySnapshots].sort(
    (left, right) => left.elapsedHours - right.elapsedHours,
  );
  return (
    <div className="rounded-md border border-zinc-800">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="text-zinc-400">Window</TableHead>
            <TableHead className="text-right text-zinc-400">Views</TableHead>
            <TableHead className="text-right text-zinc-400">
              Impressions
            </TableHead>
            <TableHead className="text-right text-zinc-400">CTR</TableHead>
            <TableHead className="text-right text-zinc-400">Coverage</TableHead>
            <TableHead className="text-right text-zinc-400">
              Avg viewed
            </TableHead>
            <TableHead className="text-right text-zinc-400">
              50% retention
            </TableHead>
            <TableHead className="text-right text-zinc-400">Net subs</TableHead>
            <TableHead className="text-zinc-400">Top source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow className="border-zinc-800" key={row.id}>
              <TableCell className="text-zinc-300">
                {formatWindow(row.elapsedHours)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatInteger(row.views)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatOptionalInteger(row.impressions)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatPercent(row.impressionClickThroughRate)}
              </TableCell>
              <TableCell className="text-right text-zinc-300">
                {formatReachCoverage(
                  getReachCoverage(row, availableReachDates),
                )}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatPercent(row.averageViewPercentage)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatRatioAsPercent(
                  getRetentionCheckpoint(
                    retentionSnapshots.filter(
                      (item) => item.elapsedHours === row.elapsedHours,
                    ),
                    50,
                  ),
                )}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatSignedInteger(
                  row.subscribersGained - row.subscribersLost,
                )}
              </TableCell>
              <TableCell className="text-xs text-zinc-400">
                {formatTrafficSource(
                  trafficSnapshots
                    .filter((item) => item.periodDays === row.elapsedHours / 24)
                    .sort((left, right) => right.views - left.views)[0]
                    ?.sourceType,
                )}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow className="border-zinc-800">
              <TableCell className="py-6 text-center text-zinc-500" colSpan={9}>
                No completed publish-window snapshots yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function PeriodPerformanceTable({ snapshots }: { snapshots: Snapshot[] }) {
  const periodOrder = new Map([
    [7, 0],
    [28, 1],
    [90, 2],
    [0, 3],
  ]);
  const rows = [...snapshots].sort(
    (left, right) =>
      (periodOrder.get(left.periodDays) ?? 99) -
      (periodOrder.get(right.periodDays) ?? 99),
  );

  return (
    <div className="rounded-md border border-zinc-800">
      <Table className="min-w-[920px]">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="text-zinc-400">Period</TableHead>
            <TableHead className="text-right text-zinc-400">Views</TableHead>
            <TableHead className="text-right text-zinc-400">
              Watch time
            </TableHead>
            <TableHead className="text-right text-zinc-400">
              Avg viewed
            </TableHead>
            <TableHead className="text-right text-zinc-400">Likes</TableHead>
            <TableHead className="text-right text-zinc-400">Comments</TableHead>
            <TableHead className="text-right text-zinc-400">Net subs</TableHead>
            <TableHead className="text-zinc-400">Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((snapshot) => (
            <TableRow className="border-zinc-800" key={snapshot.id}>
              <TableCell className="text-zinc-300">
                {formatAnalyticsPeriod(snapshot.periodDays)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatInteger(snapshot.views)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatMinutes(snapshot.estimatedMinutesWatched)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatPercent(snapshot.averageViewPercentage)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatInteger(snapshot.likes)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatInteger(snapshot.comments)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatSignedInteger(
                  snapshot.subscribersGained - snapshot.subscribersLost,
                )}
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {snapshot.syncedAt.toLocaleString("en-US")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TrafficSourcesTable({ snapshots }: { snapshots: TrafficSnapshot[] }) {
  const rows = [...snapshots]
    .sort((left, right) => right.views - left.views)
    .slice(0, 10);
  const totalViews = rows.reduce((sum, row) => sum + row.views, 0);

  return (
    <div className="rounded-md border border-zinc-800">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="text-zinc-400">Source</TableHead>
            <TableHead className="text-right text-zinc-400">Views</TableHead>
            <TableHead className="text-right text-zinc-400">Share</TableHead>
            <TableHead className="text-right text-zinc-400">
              Watch time
            </TableHead>
            <TableHead className="text-right text-zinc-400">
              Engaged views
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((snapshot) => (
            <TableRow className="border-zinc-800" key={snapshot.id}>
              <TableCell className="text-zinc-300">
                {formatTrafficSource(snapshot.sourceType)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatInteger(snapshot.views)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatPercent(
                  totalViews > 0 ? (snapshot.views / totalViews) * 100 : null,
                )}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatMinutes(snapshot.estimatedMinutesWatched)}
              </TableCell>
              <TableCell className="text-right text-zinc-100">
                {formatInteger(snapshot.engagedViews)}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow className="border-zinc-800">
              <TableCell className="py-6 text-center text-zinc-500" colSpan={5}>
                No rolling 90-day traffic source data yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function CommentsTable({
  comments,
  workByContentId,
}: {
  comments: YoutubeComment[];
  workByContentId: Map<string, Work>;
}) {
  return (
    <div className="rounded-md border border-zinc-800">
      <Table className="min-w-[980px] table-fixed">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="w-56 text-zinc-400">Work</TableHead>
            <TableHead className="w-44 text-zinc-400">Viewer</TableHead>
            <TableHead className="w-[30rem] text-zinc-400">Comment</TableHead>
            <TableHead className="w-20 text-right text-zinc-400">
              Likes
            </TableHead>
            <TableHead className="w-20 text-right text-zinc-400">
              Replies
            </TableHead>
            <TableHead className="w-44 text-zinc-400">Published</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comments.map((comment) => {
            const work = workByContentId.get(comment.contentId);
            return (
              <TableRow className="border-zinc-800" key={comment.id}>
                <TableCell className="align-top">
                  <Link
                    className="block truncate text-zinc-100 underline-offset-4 hover:underline"
                    href={`/admin/analytics/${encodeURIComponent(comment.contentId)}`}
                  >
                    {work ? getWorkDisplayTitle(work) : comment.contentId}
                  </Link>
                  <div className="mt-1 truncate font-mono text-xs text-zinc-600">
                    {comment.videoId}
                  </div>
                </TableCell>
                <TableCell className="align-top text-zinc-300">
                  <div className="truncate">{comment.authorDisplayName}</div>
                  {comment.authorChannelId ? (
                    <div className="mt-1 truncate font-mono text-xs text-zinc-600">
                      {comment.authorChannelId}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-zinc-100">
                  <p className="line-clamp-5 whitespace-pre-wrap break-words text-sm leading-6">
                    {comment.text}
                  </p>
                </TableCell>
                <TableCell className="text-right align-top text-zinc-100">
                  {formatInteger(comment.likeCount)}
                </TableCell>
                <TableCell className="text-right align-top text-zinc-100">
                  {formatInteger(comment.replyCount)}
                </TableCell>
                <TableCell className="align-top text-xs text-zinc-500">
                  {comment.publishedAt.toLocaleString("en-US")}
                  {comment.updatedAt > comment.publishedAt ? (
                    <div className="mt-1">edited</div>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
          {!comments.length ? (
            <TableRow className="border-zinc-800">
              <TableCell className="py-8 text-center text-zinc-500" colSpan={6}>
                No synced audience comments match this view.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function CommentsPagination({
  page,
  q,
  totalPages,
}: {
  page: number;
  q: string;
  totalPages: number;
}) {
  const href = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query
      ? `/admin/analytics/comments?${query}`
      : "/admin/analytics/comments";
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
      <div className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          asChild
          className={`${SECONDARY_BUTTON_CLASS} aria-disabled:pointer-events-none aria-disabled:opacity-50`}
          variant="outline"
        >
          <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))}>
            Previous
          </Link>
        </Button>
        <Button
          asChild
          className={`${SECONDARY_BUTTON_CLASS} aria-disabled:pointer-events-none aria-disabled:opacity-50`}
          variant="outline"
        >
          <Link
            aria-disabled={page >= totalPages}
            href={href(Math.min(totalPages, page + 1))}
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}

function getLatestTrafficRows(rows: TrafficSnapshot[]) {
  const latestEndDate = rows.reduce(
    (latest, row) => (row.endDate > latest ? row.endDate : latest),
    "",
  );
  return rows.filter((row) => row.endDate === latestEndDate);
}

function formatAnalyticsPeriod(periodDays: number) {
  return periodDays === 0 ? "Lifetime" : `${periodDays}d`;
}

function AnalyticsWorksCard({
  basePath,
  order,
  page,
  q,
  rows,
  sort,
  title,
}: {
  basePath: string;
  order?: string;
  page?: string;
  q?: string;
  rows: AnalyticsRow[];
  sort?: string;
  title: string;
}) {
  const analyticsSort = matchAnalyticsSort(sort);
  const sortOrder = matchSortOrder(order);
  const query = q?.trim() ?? "";
  const filteredRows = query
    ? rows.filter((row) => matchesAnalyticsSearch(row, query))
    : rows;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const sortedRows = [...filteredRows].sort((first, second) =>
    compareAnalyticsRows(first, second, analyticsSort, sortOrder),
  );
  const totalPages = Math.max(
    1,
    Math.ceil(sortedRows.length / ANALYTICS_PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = sortedRows.slice(
    (safePage - 1) * ANALYTICS_PAGE_SIZE,
    safePage * ANALYTICS_PAGE_SIZE,
  );

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className={CARD_TITLE_CLASS}>{title}</CardTitle>
            <CardDescription className={CARD_DESCRIPTION_CLASS}>
              Search by title, source, content ID, path, or YouTube video ID.
            </CardDescription>
          </div>
          <div className="text-sm text-zinc-500">
            Page {safePage} / {totalPages} · {sortedRows.length}
            {query ? ` of ${rows.length}` : ""} works
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={basePath}
          className="flex flex-col gap-2 sm:flex-row"
          method="get"
        >
          <Input
            aria-label="Search analytics works"
            className="h-10 border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600"
            defaultValue={query}
            name="q"
            placeholder="Search title, source, content ID, path, or YouTube ID"
            type="search"
          />
          <input name="sort" type="hidden" value={analyticsSort} />
          <input name="order" type="hidden" value={sortOrder} />
          <Button className={PRIMARY_BUTTON_CLASS} type="submit">
            Search
          </Button>
          {query ? (
            <Button
              asChild
              className={SECONDARY_BUTTON_CLASS}
              type="button"
              variant="outline"
            >
              <Link
                href={getAnalyticsWorksHref({
                  basePath,
                  order: sortOrder,
                  sort: analyticsSort,
                })}
              >
                Clear
              </Link>
            </Button>
          ) : null}
        </form>
        <WorksTable
          activeSort={analyticsSort}
          basePath={basePath}
          emptyMessage={
            query ? `No analytics works match “${query}”.` : undefined
          }
          order={sortOrder}
          query={query}
          rows={pageRows}
        />
        <PaginationControls
          basePath={basePath}
          order={sortOrder}
          page={safePage}
          query={query}
          sort={analyticsSort}
          totalPages={totalPages}
        />
      </CardContent>
    </Card>
  );
}

function WorksTable({
  activeSort,
  basePath,
  emptyMessage,
  order,
  query,
  rows,
}: {
  activeSort: AnalyticsSort;
  basePath: string;
  emptyMessage?: string;
  order: SortOrder;
  query: string;
  rows: AnalyticsRow[];
}) {
  return (
    <div>
      <Table className="min-w-[1220px] table-fixed">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="w-[22rem] text-zinc-400">
              <SortLink
                activeSort={activeSort}
                basePath={basePath}
                label="Work"
                order={order}
                query={query}
                sort="work"
              />
            </TableHead>
            <TableHead className="w-32 text-zinc-400">Published</TableHead>
            <TableHead className="w-28 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                basePath={basePath}
                label="Views"
                order={order}
                query={query}
                sort="views"
              />
            </TableHead>
            <TableHead className="w-32 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                basePath={basePath}
                label="Watch time"
                order={order}
                query={query}
                sort="watchTime"
              />
            </TableHead>
            <TableHead className="w-24 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                basePath={basePath}
                label="Likes"
                order={order}
                query={query}
                sort="likes"
              />
            </TableHead>
            <TableHead className="w-24 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                basePath={basePath}
                label="Comments"
                order={order}
                query={query}
                sort="comments"
              />
            </TableHead>
            <TableHead className="w-28 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                basePath={basePath}
                label="Avg viewed"
                order={order}
                query={query}
                sort="avgViewed"
              />
            </TableHead>
            <TableHead className="w-24 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                basePath={basePath}
                label="Subs"
                order={order}
                query={query}
                sort="subs"
              />
            </TableHead>
            <TableHead className="w-[18rem] text-zinc-400">Reading</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow className="border-zinc-800" key={row.snapshot.id}>
              <TableCell className="align-top">
                <Link
                  className="block truncate font-medium text-zinc-100 underline-offset-4 hover:underline"
                  href={`/admin/analytics/${encodeURIComponent(row.snapshot.contentId)}`}
                >
                  {getWorkTitle(row)}
                </Link>
                <div className="mt-1 truncate text-xs text-zinc-500">
                  {row.snapshot.videoId}
                </div>
              </TableCell>
              <TableCell className="align-top text-zinc-400">
                {formatDate(row.work?.publishedAt)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatInteger(row.snapshot.views)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatMinutes(row.snapshot.estimatedMinutesWatched)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatInteger(row.snapshot.likes)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatInteger(row.snapshot.comments)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatPercent(row.snapshot.averageViewPercentage)}
              </TableCell>
              <TableCell className="text-right align-top text-zinc-100">
                {formatSignedInteger(row.snapshot.subscribersGained)}
              </TableCell>
              <TableCell className="align-top">
                <Badge className={row.verdict.className}>
                  {row.verdict.label}
                </Badge>
                <div className="mt-1 max-w-[16rem] whitespace-normal break-words text-xs leading-5 text-zinc-500">
                  {row.verdict.description}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow className="border-zinc-800">
              <TableCell className="py-8 text-center text-zinc-500" colSpan={9}>
                {emptyMessage ?? "No synced analytics yet."}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function SortLink({
  activeSort,
  basePath,
  label,
  order,
  query,
  sort,
}: {
  activeSort: AnalyticsSort;
  basePath: string;
  label: string;
  order: SortOrder;
  query: string;
  sort: AnalyticsSort;
}) {
  const nextOrder = activeSort === sort && order === "desc" ? "asc" : "desc";
  const indicator = activeSort === sort ? (order === "desc" ? " ↓" : " ↑") : "";

  return (
    <Link
      className="inline-flex items-center justify-end gap-1 underline-offset-4 hover:text-zinc-100 hover:underline"
      href={getAnalyticsWorksHref({
        basePath,
        order: nextOrder,
        page: 1,
        q: query,
        sort,
      })}
    >
      {label}
      {indicator}
    </Link>
  );
}

function PaginationControls({
  basePath,
  order,
  page,
  query,
  sort,
  totalPages,
}: {
  basePath: string;
  order: SortOrder;
  page: number;
  query: string;
  sort: AnalyticsSort;
  totalPages: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
      <div className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          asChild
          className="border-zinc-700 bg-zinc-900 text-zinc-100 shadow-none hover:bg-zinc-800 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          variant="outline"
        >
          <Link
            aria-disabled={page <= 1}
            href={getAnalyticsWorksHref({
              basePath,
              order,
              page: Math.max(1, page - 1),
              q: query,
              sort,
            })}
          >
            Previous
          </Link>
        </Button>
        <Button
          asChild
          className="border-zinc-700 bg-zinc-900 text-zinc-100 shadow-none hover:bg-zinc-800 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          variant="outline"
        >
          <Link
            aria-disabled={page >= totalPages}
            href={getAnalyticsWorksHref({
              basePath,
              order,
              page: Math.min(totalPages, page + 1),
              q: query,
              sort,
            })}
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}

function getAnalyticsWorksHref({
  basePath = "/admin/analytics/works",
  order,
  page,
  q,
  sort,
}: {
  basePath?: string;
  order?: SortOrder;
  page?: number;
  q?: string;
  sort?: AnalyticsSort;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  if (order) params.set("order", order);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function matchesAnalyticsSearch(row: AnalyticsRow, query: string) {
  const normalizedQuery = query.toLocaleLowerCase();
  const work = row.work;
  return [
    getWorkTitle(row),
    row.snapshot.contentId,
    row.snapshot.videoId,
    work?.path,
    work?.title,
    work?.songTitle,
    work?.fromTitle,
    work?.fromSource,
    work?.fromIp,
    work?.fromSeries,
    ...(work?.fromArtists ?? []),
  ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
}

function compareAnalyticsRows(
  first: AnalyticsRow,
  second: AnalyticsRow,
  sort: AnalyticsSort,
  order: SortOrder,
) {
  const direction = order === "asc" ? 1 : -1;
  const result =
    sort === "work"
      ? getWorkTitle(first).localeCompare(getWorkTitle(second))
      : getSortableMetric(first.snapshot, sort) -
        getSortableMetric(second.snapshot, sort);

  if (result !== 0) return result * direction;
  return getWorkTitle(first).localeCompare(getWorkTitle(second));
}

function getSortableMetric(snapshot: Snapshot, sort: AnalyticsSort) {
  switch (sort) {
    case "avgViewed":
      return snapshot.averageViewPercentage ?? Number.NEGATIVE_INFINITY;
    case "comments":
      return snapshot.comments;
    case "likes":
      return snapshot.likes;
    case "subs":
      return snapshot.subscribersGained;
    case "watchTime":
      return snapshot.estimatedMinutesWatched ?? Number.NEGATIVE_INFINITY;
    case "views":
      return snapshot.views;
    case "work":
      return 0;
  }
}

function DiagnosisCard({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-sm font-medium text-zinc-100">{title}</div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className={CARD_TITLE_CLASS}>{value}</CardTitle>
        <CardDescription className={CARD_DESCRIPTION_CLASS}>
          {label}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function getVerdictGroups(rows: AnalyticsRow[]) {
  const groups = [
    {
      description: "Topic, packaging, and content are all working.",
      label: "scale",
      rows: [] as AnalyticsRow[],
    },
    {
      description:
        "Packaging gets reach; intro or song structure needs review.",
      label: "retention issue",
      rows: [] as AnalyticsRow[],
    },
    {
      description: "Content keeps viewers; packaging or topic reach is weak.",
      label: "reach issue",
      rows: [] as AnalyticsRow[],
    },
    {
      description: "Direction needs review before repeating.",
      label: "review",
      rows: [] as AnalyticsRow[],
    },
  ];

  for (const row of rows) {
    const group = groups.find((item) => item.label === row.verdict.label);
    group?.rows.push(row);
  }

  return groups;
}

function getTotals(snapshots: Snapshot[]) {
  return snapshots.reduce(
    (total, snapshot) => ({
      estimatedMinutesWatched:
        total.estimatedMinutesWatched + (snapshot.estimatedMinutesWatched ?? 0),
      comments: total.comments + snapshot.comments,
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
    estimatedMinutesWatched: median(
      snapshots.flatMap((snapshot) =>
        snapshot.estimatedMinutesWatched === null
          ? []
          : [snapshot.estimatedMinutesWatched],
      ),
    ),
    views: median(snapshots.map((snapshot) => snapshot.views)),
  };
}

function getVerdict(
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
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
      description: "Reach and retention are both above the current baseline.",
      label: "scale",
    };
  }
  if (highReach && !highRetention) {
    return {
      className: "border-amber-500/30 bg-amber-500/10 text-amber-100",
      description:
        "The video is getting reach; check intro, promise, and pacing.",
      label: "retention issue",
    };
  }
  if (!highReach && highRetention) {
    return {
      className: "border-sky-500/30 bg-sky-500/10 text-sky-100",
      description:
        "Audience stays after clicking; packaging, topic, or timing may limit reach.",
      label: "reach issue",
    };
  }
  return {
    className: "border-zinc-700 bg-zinc-950 text-zinc-300",
    description: "Below current baseline; compare topic, language, and timing.",
    label: "review",
  };
}

function getSubscribersPer1000Views(snapshot: Snapshot) {
  return snapshot.views > 0
    ? (snapshot.subscribersGained / snapshot.views) * 1000
    : null;
}

function getWorkTitle(row: AnalyticsRow) {
  return row.work?.songTitle || row.work?.title || row.snapshot.contentId;
}

function getWorkDisplayTitle(work: Work) {
  return work.songTitle || work.title || work.contentId;
}

function groupByContentId<T extends { contentId: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const current = groups.get(item.contentId) ?? [];
    current.push(item);
    groups.set(item.contentId, current);
  }
  return groups;
}

function getReleaseBaseline(
  rows: {
    early: EarlySnapshot | undefined;
    reachCoverage?: ReturnType<typeof getReachCoverage>;
    retention: RetentionSnapshot[];
  }[],
) {
  return {
    averageViewPercentage: getDistribution(
      rows.flatMap((row) =>
        row.early?.averageViewPercentage === null ||
        row.early?.averageViewPercentage === undefined ||
        row.early.views < 100 ||
        row.retention.length === 0
          ? []
          : [row.early.averageViewPercentage],
      ),
    ),
    ctr: getDistribution(
      rows.flatMap((row) =>
        row.early?.impressionClickThroughRate === null ||
        row.early?.impressionClickThroughRate === undefined ||
        (row.early.impressions ?? 0) < 1000 ||
        row.reachCoverage?.status !== "complete"
          ? []
          : [row.early.impressionClickThroughRate],
      ),
    ),
  };
}

function getReleaseVerdict(
  row: {
    early: EarlySnapshot | undefined;
    reachCoverage: ReturnType<typeof getReachCoverage>;
    retention: RetentionSnapshot[];
  },
  baseline: ReturnType<typeof getReleaseBaseline>,
) {
  if (!row.early) {
    return {
      className: "border-zinc-700 bg-zinc-950 text-zinc-300",
      description: "Waiting for the first completed publish window.",
      label: "waiting",
    };
  }
  const ctr = row.early.impressionClickThroughRate;
  const retention = row.early.averageViewPercentage;
  if (
    ctr === null ||
    retention === null ||
    row.reachCoverage.status !== "complete" ||
    row.retention.length === 0
  ) {
    return {
      className: "border-violet-500/30 bg-violet-500/10 text-violet-100",
      description:
        row.reachCoverage.status !== "complete"
          ? `Reach coverage is ${row.reachCoverage.coveredDays}/${row.reachCoverage.expectedDays} days; do not judge packaging yet.`
          : row.retention.length === 0
            ? "Detailed retention is incomplete; wait before judging the song structure."
            : "A required CTR or retention metric is unavailable.",
      label: "data incomplete",
    };
  }
  if ((row.early.impressions ?? 0) < 1000) {
    return {
      className: "border-violet-500/30 bg-violet-500/10 text-violet-100",
      description:
        "Fewer than 1,000 impressions; signal is too noisy for action.",
      label: "insufficient sample",
    };
  }
  if (baseline.ctr.count < 4 || baseline.averageViewPercentage.count < 4) {
    return {
      className: "border-violet-500/30 bg-violet-500/10 text-violet-100",
      description: "Fewer than four comparable works in this publish window.",
      label: "baseline limited",
    };
  }
  const highCtr = ctr >= baseline.ctr.p75;
  const lowCtr = ctr <= baseline.ctr.p25;
  const highRetention = retention >= baseline.averageViewPercentage.p75;
  const lowRetention = retention <= baseline.averageViewPercentage.p25;
  if (highCtr && highRetention) {
    return {
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
      description:
        "CTR and viewing quality are both in the top quartile for this window.",
      label: "strong signals",
    };
  }
  if (highCtr && lowRetention) {
    return {
      className: "border-amber-500/30 bg-amber-500/10 text-amber-100",
      description:
        "The package earns clicks; review the opening and drop-off curve.",
      label: "retention issue",
    };
  }
  if (lowCtr && highRetention) {
    return {
      className: "border-sky-500/30 bg-sky-500/10 text-sky-100",
      description:
        "Viewers stay; improve thumbnail, title, topic, or release timing.",
      label: "packaging issue",
    };
  }
  if (lowCtr && lowRetention)
    return {
      className: "border-zinc-700 bg-zinc-950 text-zinc-300",
      description: "CTR and viewing quality are both in the bottom quartile.",
      label: "review",
    };
  return {
    className: "border-zinc-700 bg-zinc-950 text-zinc-300",
    description:
      "Signals are within the normal historical range; keep monitoring.",
    label: "monitor",
  };
}

function getReachCoverage(
  early: EarlySnapshot | undefined,
  availableDates: Set<string>,
) {
  if (!early) {
    return { coveredDays: 0, expectedDays: 0, status: "waiting" as const };
  }
  const dates = enumerateDates(early.startDate, early.endDate);
  const coveredDays = dates.filter((date) => availableDates.has(date)).length;
  return {
    coveredDays,
    expectedDays: dates.length,
    status:
      coveredDays >= dates.length
        ? ("complete" as const)
        : coveredDays > 0
          ? ("partial" as const)
          : ("missing" as const),
  };
}

function enumerateDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function getReleaseVelocity(rows: RealtimeSnapshot[]) {
  const ordered = [...rows].sort(
    (left, right) => left.observedAt.getTime() - right.observedAt.getTime(),
  );
  const latest = ordered.at(-1);
  if (!latest) {
    return {
      delta1h: null,
      delta3h: null,
      delta24h: null,
      latestViews: null,
      observedAt: null,
      trend: "collecting",
      viewsPerHour3h: null,
    };
  }
  const delta = (targetHours: number) => {
    const target = latest.observedAt.getTime() - targetHours * 60 * 60 * 1000;
    const candidates = ordered.filter(
      (row) => row.observedAt.getTime() < latest.observedAt.getTime(),
    );
    const baseline = candidates.reduce<RealtimeSnapshot | undefined>(
      (nearest, row) =>
        !nearest ||
        Math.abs(row.observedAt.getTime() - target) <
          Math.abs(nearest.observedAt.getTime() - target)
          ? row
          : nearest,
      undefined,
    );
    if (!baseline) return null;
    const elapsedHours =
      (latest.observedAt.getTime() - baseline.observedAt.getTime()) /
      (60 * 60 * 1000);
    if (elapsedHours < targetHours * 0.5 || elapsedHours > targetHours * 1.75) {
      return null;
    }
    const value = Math.max(0, latest.views - baseline.views);
    return { rate: value / elapsedHours, value };
  };
  const oneHour = delta(1);
  const threeHours = delta(3);
  const day = delta(24);
  const trend =
    !oneHour || !threeHours
      ? "collecting"
      : oneHour.rate > threeHours.rate * 1.25
        ? "accelerating"
        : oneHour.rate < threeHours.rate * 0.75
          ? "slowing"
          : "stable";
  return {
    delta1h: oneHour?.value ?? null,
    delta3h: threeHours?.value ?? null,
    delta24h: day?.value ?? null,
    latestViews: latest.views,
    observedAt: latest.observedAt,
    trend,
    viewsPerHour3h: threeHours?.rate ?? null,
  };
}

function getDistribution(values: number[]) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  return {
    count: sorted.length,
    median: percentile(sorted, 0.5),
    p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75),
  };
}

function percentile(sorted: number[], ratio: number) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function getRetentionCheckpoint(rows: RetentionSnapshot[], percent: number) {
  return rows.reduce<RetentionSnapshot | undefined>(
    (nearest, row) =>
      !nearest ||
      Math.abs(row.elapsedVideoTimePercent - percent) <
        Math.abs(nearest.elapsedVideoTimePercent - percent)
        ? row
        : nearest,
    undefined,
  )?.audienceWatchRatio;
}

function formatWindow(hours: number | undefined) {
  if (!hours) return "waiting";
  if (hours === 24) return "24h";
  if (hours === 72) return "72h";
  if (hours === 168) return "7d";
  if (hours === 672) return "28d";
  return `${hours}h`;
}

function formatTrafficSource(value: string | undefined) {
  const labels: Record<string, string> = {
    EXT_URL: "External",
    NOTIFICATION: "Notifications",
    PLAYLIST: "Playlist",
    RELATED_VIDEO: "Suggested",
    SHORTS: "Shorts feed",
    SUBSCRIBER: "Subscriptions",
    YT_CHANNEL: "Channel page",
    YT_SEARCH: "YouTube search",
  };
  return value ? (labels[value] ?? value) : "n/a";
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

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatOptionalInteger(value: number | null | undefined) {
  return value === null || value === undefined ? "n/a" : formatInteger(value);
}

function formatSignedOptionalInteger(value: number | null | undefined) {
  return value === null || value === undefined
    ? "n/a"
    : formatSignedInteger(value);
}

function formatCoverage(covered: number, total: number) {
  return total > 0 ? `${covered}/${total}` : "0/0";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "publish date unknown";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(parsed);
}

function formatRatioAsPercent(value: number | null | undefined) {
  return value === null || value === undefined
    ? "n/a"
    : `${(value * 100).toFixed(1)}%`;
}

function formatReachCoverage(coverage: ReturnType<typeof getReachCoverage>) {
  if (!coverage.expectedDays) return "waiting";
  return `${coverage.coveredDays}/${coverage.expectedDays} ${coverage.status}`;
}

function getReleaseAgeHours(work: Work) {
  if (!work.publishedAt) return Number.POSITIVE_INFINITY;
  const publishedAt = Date.parse(work.publishedAt);
  return Number.isFinite(publishedAt)
    ? Math.max(0, (Date.now() - publishedAt) / (60 * 60 * 1000))
    : Number.POSITIVE_INFINITY;
}

function formatAge(hours: number) {
  if (!Number.isFinite(hours)) return "unknown";
  if (hours < 48) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function getTrendClassName(trend: string) {
  if (trend === "accelerating") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }
  if (trend === "slowing") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }
  return "border-zinc-700 bg-zinc-950 text-zinc-300";
}

function formatSignedInteger(value: number) {
  if (!value) return "0";
  return `${value > 0 ? "+" : ""}${formatInteger(value)}`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(2);
}

function formatMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "n/a";
  return `${formatInteger(minutes)} min`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "n/a";
  return `${value.toFixed(2)}%`;
}
