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
import { getAdminDatabaseStatus } from "../data/music-admin";
import {
  getAdminYoutubeCommentSyncStatus,
  getCommentTriageSummary,
  listAdminYoutubeComments,
} from "../data/youtube-comments";
import {
  getAdminYoutubeConnection,
  getYoutubeOAuthConfig,
} from "../data/youtube-connection";
import {
  COMMENT_CATEGORIES,
  COMMENT_REPLY_STATES,
} from "../model/comment-review";
import {
  categoryLabel,
  replyStatusLabel,
} from "../model/comment-triage-labels";
import { AdminActionToast } from "./admin-action-toast";
import { AdminCommentsTable } from "./admin-comments-table";
import { AdminLogin } from "./login-form";

const PAGE_SIZE = 50;
const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";
const PRIMARY_BUTTON_CLASS =
  "border-zinc-100 bg-zinc-100 text-zinc-950 shadow-none hover:bg-white";
const filterControl =
  "h-10 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-200";

export async function AdminCommentsPage(params: {
  hideOwn?: string;
  hideReplied?: string;
  replyStatus?: string;
  category?: string;
  commentId?: string;
  unlinked?: string;
  candidate?: string;
  q?: string;
  page?: string;
  status?: string;
  message?: string;
}) {
  const { status, message } = params;
  const commentId =
    typeof params.commentId === "string"
      ? params.commentId.slice(0, 300)
      : undefined;
  const category = COMMENT_CATEGORIES.find((item) => item === params.category);
  const replyStatus = COMMENT_REPLY_STATES.find(
    (item) => item === params.replyStatus,
  );
  const candidate = params.candidate === "true";
  const unlinked = params.unlinked === "true";
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
  const currentPage = Math.min(
    100000,
    Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
  );
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 300) : "";
  const hideOwn = params.hideOwn ? params.hideOwn !== "false" : !commentId;
  const hideReplied =
    (params.hideReplied === "true" || params.replyStatus === "OPEN") &&
    !replyStatus &&
    !commentId;
  const youtubeConnection = databaseStatus.ok
    ? await getAdminYoutubeConnection()
    : null;
  const [{ items, total }, syncStatus, summary] = databaseStatus.ok
    ? await Promise.all([
        listAdminYoutubeComments({
          hideOwn,
          hideReplied,
          replyStatus,
          category,
          unlinked,
          candidate,
          commentId,
          limit: PAGE_SIZE,
          offset: (currentPage - 1) * PAGE_SIZE,
          ownerChannelId: youtubeConnection?.channelId,
          q: query,
        }),
        getAdminYoutubeCommentSyncStatus(),
        getCommentTriageSummary(youtubeConnection?.channelId),
      ])
    : [
        { items: [], total: 0 },
        null,
        { unclassified: 0, possibleRequests: 0, unlinkedRequests: 0 },
      ];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = new URLSearchParams();
  if (query) base.set("q", query);
  if (category) base.set("category", category);
  if (replyStatus) base.set("replyStatus", replyStatus);
  if (hideReplied) base.set("hideReplied", "true");
  if (!hideOwn) base.set("hideOwn", "false");
  if (unlinked) base.set("unlinked", "true");
  if (candidate) base.set("candidate", "true");
  if (commentId) base.set("commentId", commentId);
  function href(page: number) {
    const p = new URLSearchParams(base);
    if (page > 1) p.set("page", String(page));
    return p.size ? `/admin/comments?${p}` : "/admin/comments";
  }
  const filters = [
    {
      title: "All audience comments",
      href: "/admin/comments",
      active:
        !category &&
        !unlinked &&
        !candidate &&
        !replyStatus &&
        !query &&
        !commentId &&
        !hideReplied &&
        hideOwn,
    },
    {
      title: `Possible song requests · ${summary.possibleRequests}`,
      href: "/admin/comments?candidate=true",
      active: candidate,
    },
    {
      title: `Song requests to link · ${summary.unlinkedRequests}`,
      href: "/admin/comments?category=SONG_REQUEST&unlinked=true",
      active: category === "SONG_REQUEST" && unlinked,
    },
    {
      title: `Unclassified · ${summary.unclassified}`,
      href: "/admin/comments?category=UNCLASSIFIED",
      active: category === "UNCLASSIFIED" && !candidate,
    },
  ];
  return (
    <section className="space-y-5">
      <Card className={CARD_CLASS}>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <MessageSquareText className="h-4 w-4" />
              YouTube
            </div>
            <CardTitle className="text-3xl text-zinc-100">
              Comment inbox
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Find song requests, review reply drafts and track your responses.
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
            {total.toLocaleString("en-US")} comments match the current filters.
            Latest sync:{" "}
            {syncStatus?.syncedAt
              ? syncStatus.syncedAt.toLocaleString("en-US")
              : "not synced yet"}
            {syncStatus?.message ? ` · ${syncStatus.message}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <nav aria-label="Comment queues" className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 aria-[current=page]:border-sky-500 aria-[current=page]:bg-sky-950/50 aria-[current=page]:text-sky-200"
              >
                {item.title}
              </Link>
            ))}
          </nav>
          {candidate && (
            <p className="text-sm text-zinc-400">
              Unclassified comments with common song-request phrases. Review the
              original wording to confirm.
            </p>
          )}
          <form
            action="/admin/comments"
            className="flex flex-wrap items-end gap-3"
            method="get"
          >
            {candidate && <input type="hidden" name="candidate" value="true" />}
            {unlinked && <input type="hidden" name="unlinked" value="true" />}
            {commentId && (
              <input type="hidden" name="commentId" value={commentId} />
            )}
            <label
              htmlFor="comment-search"
              className="grid min-w-0 flex-1 gap-1 text-xs text-zinc-400"
            >
              Search
              <Input
                id="comment-search"
                className="min-w-36 border-zinc-700 bg-zinc-950"
                name="q"
                defaultValue={query}
                placeholder="Comment, viewer or video ID"
                maxLength={300}
                type="search"
              />
            </label>
            <label className="grid gap-1 text-xs text-zinc-400">
              Category
              <select
                name="category"
                className={filterControl}
                defaultValue={category || ""}
              >
                <option value="">All categories</option>
                {COMMENT_CATEGORIES.map((v) => (
                  <option key={v} value={v}>
                    {categoryLabel[v]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-zinc-400">
              Reply status
              <select
                name="replyStatus"
                className={filterControl}
                defaultValue={replyStatus || (hideReplied ? "OPEN" : "")}
              >
                <option value="">All reply states</option>
                {hideReplied && (
                  <option value="OPEN">
                    Hide already replied (legacy filter)
                  </option>
                )}
                {COMMENT_REPLY_STATES.map((v) => (
                  <option key={v} value={v}>
                    {replyStatusLabel[v]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-zinc-400">
              Authors
              <select
                name="hideOwn"
                className={filterControl}
                defaultValue={String(hideOwn)}
              >
                <option value="true">Audience only</option>
                <option value="false">Include my comments</option>
              </select>
            </label>
            <Button className={PRIMARY_BUTTON_CLASS} type="submit">
              Filter
            </Button>
            {base.size > 0 && (
              <Link
                className="pb-2 text-sm text-sky-300"
                href="/admin/comments"
              >
                Reset filters
              </Link>
            )}
          </form>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-sky-300">
            <Link
              href={
                candidate
                  ? "/admin/comments?action=comments.analyze&candidate=true"
                  : "/admin/comments?action=comments.analyze"
              }
            >
              {candidate
                ? "Analyze possible song requests"
                : "Analyze unanswered comments"}
            </Link>
            <Link href="/admin/comment-reviews">
              Saved reviews and reply drafts
            </Link>
          </div>
          <AdminCommentsTable
            comments={items}
            focusedId={commentId}
            ownChannelId={youtubeConnection?.channelId}
            returnTo={href(currentPage)}
          />
          <nav
            aria-label="Comment pages"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4 text-sm text-zinc-400"
          >
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-5 text-sky-300">
              {currentPage > 1 && (
                <Link href={href(Math.min(currentPage - 1, totalPages))}>
                  Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={href(currentPage + 1)}>Next</Link>
              )}
            </div>
          </nav>
        </CardContent>
      </Card>
    </section>
  );
}
