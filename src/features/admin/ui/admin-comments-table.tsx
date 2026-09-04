"use client";

import { ExternalLink, MessageCircle, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "sovia-admin-comment-filters";
const OWN_CHANNEL_HANDLE = "comradesovia";
const DEFAULT_FILTERS = { hideOwn: true, hideReplied: true };

export type AdminCommentTableRow = {
  authorChannelId: string | null;
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  contentId: string;
  hasOwnerReply: boolean;
  id: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
  text: string;
  updatedAt: string;
  videoId: string;
};

type FilterPreferences = typeof DEFAULT_FILTERS;

export function AdminCommentsTable({
  comments,
  filters,
  hasExplicitFilters,
  ownChannelId,
  renderedAt,
  workTitles,
}: {
  comments: AdminCommentTableRow[];
  filters: FilterPreferences;
  hasExplicitFilters: boolean;
  ownChannelId: string | null;
  renderedAt: string;
  workTitles: Record<string, string>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasExplicitFilters) return;
    try {
      const storedValue = localStorage.getItem(STORAGE_KEY);
      if (!storedValue) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FILTERS));
        return;
      }
      const stored = JSON.parse(storedValue);
      if (
        stored &&
        typeof stored.hideOwn === "boolean" &&
        typeof stored.hideReplied === "boolean"
      ) {
        if (
          stored.hideOwn !== filters.hideOwn ||
          stored.hideReplied !== filters.hideReplied
        ) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("hideOwn", String(stored.hideOwn));
          params.set("hideReplied", String(stored.hideReplied));
          params.delete("page");
          router.replace(`${pathname}?${params.toString()}`);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [filters, hasExplicitFilters, pathname, router, searchParams]);

  const updateFilter = (key: keyof FilterPreferences, checked: boolean) => {
    const next = { ...filters, [key]: checked };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const params = new URLSearchParams(searchParams.toString());
    params.set("hideOwn", String(next.hideOwn));
    params.set("hideReplied", String(next.hideReplied));
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-zinc-950 px-3 py-2.5">
        <FilterCheckbox
          checked={filters.hideOwn}
          id="hide-own-comments"
          label="Hide my comments"
          onCheckedChange={(checked) => updateFilter("hideOwn", checked)}
        />
        <FilterCheckbox
          checked={filters.hideReplied}
          id="hide-replied-comments"
          label="Hide already replied"
          onCheckedChange={(checked) => updateFilter("hideReplied", checked)}
        />
        <div className="text-xs text-zinc-500">
          {comments.length} matching comments on this page · saved in this
          browser
        </div>
      </div>

      <div className="divide-y divide-zinc-800/80">
        {comments.map((comment) => (
          <article className="flex gap-3 px-2 py-4" key={comment.id}>
            <CommentAvatar comment={comment} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                <span className="truncate font-medium text-zinc-300">
                  {comment.authorDisplayName}
                </span>
                {isOwnComment(comment, ownChannelId) ? (
                  <Badge className="h-4 shrink-0 border-zinc-700 bg-zinc-800 px-1.5 text-[9px] text-zinc-300">
                    You
                  </Badge>
                ) : null}
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">
                  {formatRelativeTime(comment.publishedAt, renderedAt)}
                  {comment.updatedAt > comment.publishedAt ? " · edited" : ""}
                </span>
              </div>

              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-zinc-100">
                {comment.text}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                <Link
                  className="mr-1 max-w-64 truncate text-zinc-500 hover:text-zinc-200"
                  href={`/admin/content/${encodeURIComponent(comment.contentId)}?step=youtube`}
                  title={workTitles[comment.contentId] ?? comment.contentId}
                >
                  {workTitles[comment.contentId] ?? comment.contentId}
                </Link>
                {comment.likeCount > 0 ? (
                  <span className="inline-flex h-7 items-center gap-1 rounded-full px-2 hover:bg-zinc-800">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {formatInteger(comment.likeCount)}
                  </span>
                ) : null}
                <span className="inline-flex h-7 items-center gap-1 rounded-full px-2">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {comment.replyCount}
                </span>
                {comment.hasOwnerReply ? (
                  <Badge className="h-5 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-200">
                    Replied
                  </Badge>
                ) : null}
                <a
                  aria-label={`Open comment by ${comment.authorDisplayName} on YouTube`}
                  className="inline-flex h-7 items-center gap-1 rounded-full px-2 font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                  href={`https://www.youtube.com/watch?v=${encodeURIComponent(comment.videoId)}&lc=${encodeURIComponent(comment.id)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  YouTube
                </a>
              </div>
            </div>
          </article>
        ))}
        {!comments.length ? (
          <div className="px-3 py-10 text-center text-sm text-zinc-500">
            No comments match the current filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CommentAvatar({ comment }: { comment: AdminCommentTableRow }) {
  const initial =
    comment.authorDisplayName.trim().charAt(0).toUpperCase() || "?";
  if (comment.authorProfileImageUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: YouTube supplies dynamic external avatar URLs.
      <img
        alt=""
        className="size-8 shrink-0 rounded-full bg-zinc-800 object-cover"
        height={32}
        loading="lazy"
        referrerPolicy="no-referrer"
        src={comment.authorProfileImageUrl}
        width={32}
      />
    );
  }
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-200">
      {initial}
    </div>
  );
}

function FilterCheckbox({
  checked,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        id={id}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label className="cursor-pointer text-sm text-zinc-200" htmlFor={id}>
        {label}
      </Label>
    </div>
  );
}

function isOwnComment(
  comment: Pick<AdminCommentTableRow, "authorChannelId" | "authorDisplayName">,
  ownChannelId: string | null,
) {
  return (
    (Boolean(ownChannelId) && comment.authorChannelId === ownChannelId) ||
    normalizeYoutubeHandle(comment.authorDisplayName) === OWN_CHANNEL_HANDLE
  );
}

function normalizeYoutubeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLocaleLowerCase("en-US");
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatRelativeTime(value: string, renderedAt: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.parse(renderedAt) - Date.parse(value)) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
