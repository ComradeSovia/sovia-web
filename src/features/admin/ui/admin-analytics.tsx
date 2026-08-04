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
} from "../data/youtube-analytics";
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
const ANALYTICS_PAGE_SIZE = 25;
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
type AnalyticsRow = {
  snapshot: Snapshot;
  verdict: ReturnType<typeof getVerdict>;
  work: Work | undefined;
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
  status,
}: {
  message?: string;
  status?: string;
}) {
  return (
    <AdminAnalyticsFrame message={message} status={status}>
      {async ({ rows, snapshots, syncStatus, totals, youtubeConfig }) => (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Views" value={formatInteger(totals.views)} />
            <MetricCard label="Likes" value={formatInteger(totals.likes)} />
            <MetricCard
              label="Comments"
              value={formatInteger(totals.comments)}
            />
            <MetricCard
              label="Synced videos"
              value={formatInteger(snapshots.length)}
            />
          </div>

          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className={CARD_TITLE_CLASS}>
                AI Diagnosis Focus
              </CardTitle>
              <CardDescription className={CARD_DESCRIPTION_CLASS}>
                The dashboard is intentionally narrow: packaging, retention, and
                Sovia audience conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <DiagnosisCard
                description="Uses impressions and weighted CTR after the daily Reporting API Reach report is available."
                title="Do title and thumbnail earn clicks?"
              />
              <DiagnosisCard
                description="Uses 10s/30s/60s retention and average percentage viewed."
                title="Does the song keep viewers?"
              />
              <DiagnosisCard
                description="Uses subscribers per 1,000 views to separate IP traffic from Sovia audience growth."
                title="Does this build Sovia's audience?"
              />
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
            <CardContent className="grid gap-3 md:grid-cols-4">
              {rows.slice(0, 4).map((row) => (
                <WorkSummaryCard key={row.snapshot.id} row={row} />
              ))}
              {!rows.length ? (
                <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-500">
                  No synced analytics yet.
                </div>
              ) : null}
            </CardContent>
          </Card>

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
  sort,
}: {
  order?: string;
  page?: string;
  sort?: string;
}) {
  return (
    <AdminAnalyticsFrame>
      {async ({ rows }) => {
        const analyticsSort = matchAnalyticsSort(sort);
        const sortOrder = matchSortOrder(order);
        const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
        const sortedRows = [...rows].sort((first, second) =>
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
                  <CardTitle className={CARD_TITLE_CLASS}>Works</CardTitle>
                  <CardDescription className={CARD_DESCRIPTION_CLASS}>
                    Sortable work diagnosis table for AI-ready analytics.
                  </CardDescription>
                </div>
                <div className="text-sm text-zinc-500">
                  Page {safePage} / {totalPages} · {sortedRows.length} works
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <WorksTable
                activeSort={analyticsSort}
                order={sortOrder}
                rows={pageRows}
              />
              <PaginationControls page={safePage} totalPages={totalPages} />
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
      {async ({ rows }) => {
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
                  value={formatNumber(getSubscribersPer1000Views(row.snapshot))}
                />
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
                  order="desc"
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
  const [works, snapshots, syncStatus, youtubeConnection] = databaseStatus.ok
    ? await Promise.all([
        listAdminMusicWorks(),
        listLatestYoutubeAnalyticsSnapshots(),
        getYoutubeAnalyticsSyncStatus(),
        getAdminYoutubeConnection(),
      ])
    : [[], [], null, null];
  const workByContentId = new Map(works.map((work) => [work.contentId, work]));
  const baseline = getBaseline(snapshots);
  const rows = snapshots.map((snapshot) => ({
    snapshot,
    work: workByContentId.get(snapshot.contentId),
    verdict: getVerdict(snapshot, baseline),
  }));

  return {
    baseline,
    databaseStatus,
    rows,
    snapshots,
    syncStatus,
    totals: getTotals(snapshots),
    youtubeConfig,
    youtubeConnection,
  };
}

function WorksTable({
  activeSort,
  order,
  rows,
}: {
  activeSort: AnalyticsSort;
  order: SortOrder;
  rows: AnalyticsRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[980px] table-fixed">
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="w-[22rem] text-zinc-400">
              <SortLink
                activeSort={activeSort}
                label="Work"
                order={order}
                sort="work"
              />
            </TableHead>
            <TableHead className="w-28 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                label="Views"
                order={order}
                sort="views"
              />
            </TableHead>
            <TableHead className="w-32 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                label="Watch time"
                order={order}
                sort="watchTime"
              />
            </TableHead>
            <TableHead className="w-24 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                label="Likes"
                order={order}
                sort="likes"
              />
            </TableHead>
            <TableHead className="w-28 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                label="Avg viewed"
                order={order}
                sort="avgViewed"
              />
            </TableHead>
            <TableHead className="w-24 text-right text-zinc-400">
              <SortLink
                activeSort={activeSort}
                label="Subs"
                order={order}
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
                  href={`/admin/analytics/works/${encodeURIComponent(row.snapshot.contentId)}`}
                >
                  {getWorkTitle(row)}
                </Link>
                <div className="mt-1 truncate text-xs text-zinc-500">
                  {row.snapshot.videoId}
                </div>
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
              <TableCell className="py-8 text-center text-zinc-500" colSpan={7}>
                No synced analytics yet.
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
  label,
  order,
  sort,
}: {
  activeSort: AnalyticsSort;
  label: string;
  order: SortOrder;
  sort: AnalyticsSort;
}) {
  const nextOrder = activeSort === sort && order === "desc" ? "asc" : "desc";
  const indicator = activeSort === sort ? (order === "desc" ? " ↓" : " ↑") : "";

  return (
    <Link
      className="inline-flex items-center justify-end gap-1 underline-offset-4 hover:text-zinc-100 hover:underline"
      href={getAnalyticsWorksHref({ order: nextOrder, page: 1, sort })}
    >
      {label}
      {indicator}
    </Link>
  );
}

function PaginationControls({
  page,
  totalPages,
}: {
  page: number;
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
            href={getAnalyticsWorksHref({ page: Math.max(1, page - 1) })}
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
              page: Math.min(totalPages, page + 1),
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
  order,
  page,
  sort,
}: {
  order?: SortOrder;
  page?: number;
  sort?: AnalyticsSort;
}) {
  const params = new URLSearchParams();
  if (sort) params.set("sort", sort);
  if (order) params.set("order", order);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/analytics/works?${query}` : "/admin/analytics/works";
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

function WorkSummaryCard({ row }: { row: AnalyticsRow }) {
  return (
    <Link
      className="block rounded-md border border-zinc-800 bg-zinc-950 p-3 hover:border-zinc-700"
      href={`/admin/analytics/works/${encodeURIComponent(row.snapshot.contentId)}`}
    >
      <div className="truncate text-sm font-medium text-zinc-100">
        {getWorkTitle(row)}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100">
        {formatInteger(row.snapshot.views)}
      </div>
      <div className="mt-1 text-xs text-zinc-500">views</div>
    </Link>
  );
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
