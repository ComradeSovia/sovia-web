import { MessageSquareText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminAuthStatus, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  listAdminMusicWorks,
} from "../data/music-admin";
import {
  getAdminYoutubeCommentSyncStatus,
  listAdminYoutubeComments,
} from "../data/youtube-comments";
import {
  getAdminYoutubeConnection,
  getYoutubeOAuthConfig,
} from "../data/youtube-connection";
import { AdminActionToast } from "./admin-action-toast";
import { AdminCommentsTable } from "./admin-comments-table";
import { AdminLogin } from "./login-form";

const PAGE_SIZE = 50;
const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";
const PRIMARY_BUTTON_CLASS =
  "border-zinc-100 bg-zinc-100 text-zinc-950 shadow-none hover:bg-white";
const SECONDARY_BUTTON_CLASS =
  "border-zinc-700 bg-zinc-900 text-zinc-100 shadow-none hover:bg-zinc-800";

export async function AdminCommentsPage({
  hideOwn: hideOwnParam,
  hideReplied: hideRepliedParam,
  message,
  page,
  q,
  status,
}: {
  hideOwn?: string;
  hideReplied?: string;
  message?: string;
  page?: string;
  q?: string;
  status?: string;
}) {
  const authStatus = getAdminAuthStatus();
  if (!authStatus.enabled) {
    return (
      <Alert className="border-zinc-700 bg-zinc-900 text-zinc-100">
        <MessageSquareText className="mb-3 h-5 w-5 text-zinc-400" />
        <AlertTitle>admin auth disabled</AlertTitle>
        <AlertDescription className="text-zinc-400">
          {authStatus.message}
          {authStatus.missing.length
            ? ` Missing: ${authStatus.missing.join(", ")}.`
            : ""}
        </AlertDescription>
      </Alert>
    );
  }
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin mode={authStatus.mode} />;
  }

  const databaseStatus = await getAdminDatabaseStatus();
  const youtubeConfig = getYoutubeOAuthConfig();
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const query = q?.trim() ?? "";
  const hideOwn = hideOwnParam !== "false";
  const hideReplied = hideRepliedParam !== "false";
  const youtubeConnection = databaseStatus.ok
    ? await getAdminYoutubeConnection()
    : null;
  const [{ items, total }, syncStatus, works] = databaseStatus.ok
    ? await Promise.all([
        listAdminYoutubeComments({
          hideOwn,
          hideReplied,
          limit: PAGE_SIZE,
          offset: (currentPage - 1) * PAGE_SIZE,
          ownerChannelId: youtubeConnection?.channelId,
          q: query,
        }),
        getAdminYoutubeCommentSyncStatus(),
        listAdminMusicWorks(),
      ])
    : [{ items: [], total: 0 }, null, []];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="space-y-5">
      <Card className={CARD_CLASS}>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <MessageSquareText className="h-4 w-4" />
              YouTube Comments
            </div>
            <CardTitle className="text-3xl text-zinc-100">Comments</CardTitle>
            <CardDescription className="text-zinc-400">
              Review and organize audience comments independently from
              analytics.
            </CardDescription>
          </div>
          <form action="/admin/comments/sync" method="post">
            <Button
              className={PRIMARY_BUTTON_CLASS}
              disabled={!databaseStatus.ok || !youtubeConfig.ok}
              type="submit"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync comments
            </Button>
          </form>
        </CardHeader>
      </Card>

      <AdminActionToast
        message={message}
        status={status === "success" ? "success" : "error"}
      />

      {!databaseStatus.ok ? (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-100">
          <AlertTitle>Database unavailable</AlertTitle>
          <AlertDescription>{databaseStatus.message}</AlertDescription>
        </Alert>
      ) : null}
      {!youtubeConnection ? (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
          <AlertTitle>YouTube is not connected</AlertTitle>
          <AlertDescription>
            Connect the YouTube channel from the dashboard before syncing
            comments.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-zinc-100">Audience Comments</CardTitle>
          <CardDescription className="text-zinc-400">
            {total} audience comments match the current filters. Latest sync:{" "}
            {syncStatus?.syncedAt
              ? syncStatus.syncedAt.toLocaleString("en-US")
              : "not synced yet"}
            {syncStatus?.message ? ` · ${syncStatus.message}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-5 text-sky-100">
            Comments sync incrementally every 30 minutes. Unfinished history
            imports resume from the saved page cursor. Owner replies are
            detected using the connected YouTube channel.
          </div>
          <form
            action="/admin/comments"
            className="flex flex-col gap-2 sm:flex-row"
            method="get"
          >
            <input name="hideOwn" type="hidden" value={String(hideOwn)} />
            <input
              name="hideReplied"
              type="hidden"
              value={String(hideReplied)}
            />
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
                <Link
                  href={`/admin/comments?hideOwn=${hideOwn}&hideReplied=${hideReplied}`}
                >
                  Clear
                </Link>
              </Button>
            ) : null}
          </form>
          <AdminCommentsTable
            comments={items.map((comment) => ({
              authorChannelId: comment.authorChannelId,
              authorDisplayName: comment.authorDisplayName,
              authorProfileImageUrl: comment.authorProfileImageUrl,
              contentId: comment.contentId,
              hasOwnerReply: comment.hasOwnerReply,
              id: comment.id,
              likeCount: comment.likeCount,
              publishedAt: comment.publishedAt.toISOString(),
              replyCount: comment.replyCount,
              text: comment.text,
              updatedAt: comment.updatedAt.toISOString(),
              videoId: comment.videoId,
            }))}
            filters={{ hideOwn, hideReplied }}
            hasExplicitFilters={
              hideOwnParam !== undefined && hideRepliedParam !== undefined
            }
            ownChannelId={youtubeConnection?.channelId ?? null}
            renderedAt={new Date().toISOString()}
            workTitles={Object.fromEntries(
              works.map((work) => [
                work.contentId,
                work.songTitle || work.title || work.contentId,
              ]),
            )}
          />
          <CommentsPagination
            hideOwn={hideOwn}
            hideReplied={hideReplied}
            page={Math.min(currentPage, totalPages)}
            q={query}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function CommentsPagination({
  hideOwn,
  hideReplied,
  page,
  q,
  totalPages,
}: {
  hideOwn: boolean;
  hideReplied: boolean;
  page: number;
  q: string;
  totalPages: number;
}) {
  const href = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("hideOwn", String(hideOwn));
    params.set("hideReplied", String(hideReplied));
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/admin/comments?${query}` : "/admin/comments";
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
