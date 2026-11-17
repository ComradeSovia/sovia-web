import { getPrismaClient } from "@sovia/sound/data/prisma";
import { getYouTubeAccessToken } from "@sovia/youtube-api/data/video-metadata";
import { Prisma } from "@/generated/prisma/client";
import {
  commentInboxFilter,
  commentInboxIndex,
  type InboxFilters,
  type InboxIndexRow,
  possibleRequest,
} from "./comment-inbox-query";
import { listAdminMusicWorks } from "./music-admin";
import {
  getAdminYoutubeConnection,
  getAdminYoutubeCredentials,
} from "./youtube-connection";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const SYNC_ID = "primary";
const PAGE_SIZE = 100;
const INITIAL_SYNC_PAGES = 10;
const INCREMENTAL_SYNC_PAGES = 3;
const OWNER_REPLY_REFRESH_LIMIT = 20;

export type YoutubeCommentSort =
  | "mostLiked"
  | "mostReplies"
  | "newest"
  | "oldest";

type CommentResource = {
  id?: string;
  snippet?: {
    authorChannelId?: { value?: string };
    authorDisplayName?: string;
  };
};

type CommentThreadResponse = {
  error?: { error_description?: string; message?: string };
  items?: CommentThreadResource[];
  nextPageToken?: string;
};

type CommentListResponse = {
  error?: { error_description?: string; message?: string };
  items?: CommentResource[];
  nextPageToken?: string;
};

type CommentThreadResource = {
  id?: string;
  replies?: { comments?: CommentResource[] };
  snippet?: {
    channelId?: string;
    topLevelComment?: {
      id?: string;
      snippet?: {
        authorChannelId?: { value?: string };
        authorDisplayName?: string;
        authorProfileImageUrl?: string;
        likeCount?: number;
        publishedAt?: string;
        textDisplay?: string;
        textOriginal?: string;
        updatedAt?: string;
      };
    };
    totalReplyCount?: number;
    videoId?: string;
  };
};

export async function getAdminYoutubeCommentSyncStatus() {
  const prisma = getPrismaClient();
  if (!prisma) return null;
  return prisma.adminYoutubeCommentSync.findUnique({ where: { id: SYNC_ID } });
}

export async function getCommentTriageSummary(ownerChannelId?: string | null) {
  const db = getPrismaClient();
  const empty = { unclassified: 0, possibleRequests: 0, unlinkedRequests: 0 };
  if (!db) return empty;
  const [row] = await db.$queryRaw<(typeof empty)[]>`
    ${commentInboxIndex({ hideOwn: true, ownerChannelId })}
    SELECT count(*) FILTER(WHERE "effectiveCategory"='UNCLASSIFIED')::int AS unclassified,
      count(*) FILTER(WHERE ${possibleRequest})::int AS "possibleRequests",
      count(*) FILTER(WHERE "effectiveCategory"='SONG_REQUEST' AND NOT linked)::int AS "unlinkedRequests"
    FROM inbox`;
  return row ?? empty;
}

export async function listAdminYoutubeComments(
  filters: InboxFilters & {
    limit?: number;
    offset?: number;
    sort?: YoutubeCommentSort;
  } = {},
) {
  const db = getPrismaClient();
  if (!db) return { items: [], total: 0 };
  const { limit = 50, offset = 0, sort = "newest" } = filters;
  const index = commentInboxIndex(filters);
  const where = commentInboxFilter(filters);
  const order = {
    oldest: Prisma.sql`"publishedAt" ASC, id ASC`,
    mostLiked: Prisma.sql`"likeCount" DESC, "publishedAt" DESC, id ASC`,
    mostReplies: Prisma.sql`"replyCount" DESC, "publishedAt" DESC, id ASC`,
    newest: Prisma.sql`"publishedAt" DESC, id ASC`,
  }[sort];
  const [rows, count] = await Promise.all([
    db.$queryRaw<
      InboxIndexRow[]
    >`${index} SELECT id, "currentReviewId", "effectiveCategory", "replyStatus" FROM inbox ${where} ORDER BY ${order} LIMIT ${Math.min(100, Math.max(1, limit))} OFFSET ${Math.max(0, offset)}`,
    db.$queryRaw<
      { total: number }[]
    >`${index} SELECT count(*)::int AS total FROM inbox ${where}`,
  ]);
  const comments = rows.length
    ? await db.adminYoutubeComment.findMany({
        where: { id: { in: rows.map((row) => row.id) } },
        include: {
          work: {
            select: { path: true, content: { select: { songTitle: true } } },
          },
          reviews: {
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            select: {
              id: true,
              model: true,
              category: true,
              replyAdvice: true,
              rationale: true,
              sourceVersion: true,
              sourceHash: true,
              reviewedAt: true,
              dismissedAt: true,
              replyApprovedAt: true,
              copiedAt: true,
              requests: {
                select: {
                  request: { select: { id: true, title: true, status: true } },
                },
              },
            },
          },
        },
      })
    : [];
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  return {
    items: rows.flatMap((row) => {
      const comment = byId.get(row.id);
      return comment ? [{ ...comment, ...row }] : [];
    }),
    total: count[0]?.total ?? 0,
  };
}

export async function syncAdminYoutubeComments({
  maxPages,
}: {
  maxPages?: number;
} = {}) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");
  const connection = await getAdminYoutubeConnection();
  if (!connection) throw new Error("Connect a YouTube channel first.");
  const credentials = await getAdminYoutubeCredentials();
  const accessToken = await getYouTubeAccessToken(credentials);
  const previous = await getAdminYoutubeCommentSyncStatus();
  const isSameChannel = previous?.channelId === connection.channelId;
  const previousBoundary = isSameChannel
    ? previous.lastCommentPublishedAt
    : null;
  const continuationPageToken = isSameChannel
    ? (previous.nextPageToken ?? undefined)
    : undefined;
  const pendingNewestPublishedAt = isSameChannel
    ? previous.pendingNewestPublishedAt
    : null;
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);

  if (
    previous?.status === "running" &&
    previous.startedAt &&
    previous.startedAt >= staleBefore
  ) {
    throw new Error("A YouTube comment sync is already running.");
  }

  await prisma.adminYoutubeCommentSync.upsert({
    create: {
      channelId: connection.channelId,
      id: SYNC_ID,
      startedAt: new Date(),
      status: "running",
    },
    update: {
      channelId: connection.channelId,
      lastCommentPublishedAt: previousBoundary,
      message: null,
      nextPageToken: continuationPageToken ?? null,
      pendingNewestPublishedAt,
      startedAt: new Date(),
      status: "running",
    },
    where: { id: SYNC_ID },
  });

  try {
    const works = await listAdminMusicWorks();
    const contentIdByVideoId = new Map(
      works.flatMap((work) =>
        work.u2bId ? [[work.u2bId, work.contentId] as const] : [],
      ),
    );
    const pageLimit = Math.min(
      25,
      Math.max(
        1,
        maxPages ??
          (previousBoundary ? INCREMENTAL_SYNC_PAGES : INITIAL_SYNC_PAGES),
      ),
    );
    let pageToken = continuationPageToken;
    let pagesFetched = 0;
    let replyPagesFetched = 0;
    let commentsSynced = 0;
    const processedCommentIds = new Set<string>();
    let newestPublishedAt = pendingNewestPublishedAt ?? previousBoundary;
    let reachedPreviousBoundary = false;

    do {
      const payload = await fetchCommentThreads({
        accessToken,
        channelId: connection.channelId,
        pageToken,
      });
      pagesFetched += 1;

      for (const thread of payload.items ?? []) {
        const parsed = parseCommentThread(thread);
        if (!parsed) continue;
        if (!newestPublishedAt || parsed.publishedAt > newestPublishedAt) {
          newestPublishedAt = parsed.publishedAt;
        }
        if (previousBoundary && parsed.publishedAt <= previousBoundary) {
          reachedPreviousBoundary = true;
        }
        const contentId = contentIdByVideoId.get(parsed.videoId);
        if (!contentId) continue;
        const ownerReply = await getOwnerReplyStatus({
          accessToken,
          ownerChannelId: connection.channelId,
          thread,
          topLevelCommentId: parsed.id,
          totalReplyCount: parsed.replyCount,
        });
        replyPagesFetched += ownerReply.pagesFetched;
        processedCommentIds.add(parsed.id);

        await prisma.adminYoutubeComment.upsert({
          create: {
            ...parsed,
            contentId,
            hasOwnerReply: ownerReply.hasOwnerReply,
            ownerReplyCheckedAt: new Date(),
          },
          update: {
            authorChannelId: parsed.authorChannelId,
            authorDisplayName: parsed.authorDisplayName,
            authorProfileImageUrl: parsed.authorProfileImageUrl,
            hasOwnerReply: ownerReply.hasOwnerReply,
            likeCount: parsed.likeCount,
            ownerReplyCheckedAt: new Date(),
            replyCount: parsed.replyCount,
            text: parsed.text,
            updatedAt: parsed.updatedAt,
            syncedAt: new Date(),
          },
          where: { id: parsed.id },
        });
        commentsSynced += 1;
      }

      pageToken = payload.nextPageToken;

      const caughtUp = reachedPreviousBoundary || !pageToken;
      await prisma.adminYoutubeCommentSync.update({
        data: caughtUp
          ? {
              lastCommentPublishedAt: newestPublishedAt,
              nextPageToken: null,
              pendingNewestPublishedAt: null,
            }
          : {
              nextPageToken: pageToken,
              pendingNewestPublishedAt: newestPublishedAt,
            },
        where: { id: SYNC_ID },
      });
    } while (pageToken && pagesFetched < pageLimit && !reachedPreviousBoundary);

    const replyRefreshCandidates = await prisma.adminYoutubeComment.findMany({
      orderBy: [{ ownerReplyCheckedAt: "asc" }, { publishedAt: "desc" }],
      select: { id: true },
      take: OWNER_REPLY_REFRESH_LIMIT,
      where: {
        hasOwnerReply: false,
        ...(processedCommentIds.size
          ? { id: { notIn: Array.from(processedCommentIds) } }
          : {}),
      },
    });
    for (const candidate of replyRefreshCandidates) {
      const ownerReply = await fetchOwnerReplyStatus({
        accessToken,
        ownerChannelId: connection.channelId,
        parentId: candidate.id,
      });
      replyPagesFetched += ownerReply.pagesFetched;
      await prisma.adminYoutubeComment.update({
        data: {
          hasOwnerReply: ownerReply.hasOwnerReply,
          ownerReplyCheckedAt: new Date(),
          replyCount: ownerReply.replyCount,
        },
        where: { id: candidate.id },
      });
    }

    const hasMorePages = Boolean(pageToken && !reachedPreviousBoundary);
    const quotaUnits = pagesFetched + replyPagesFetched;
    const message = hasMorePages
      ? `Synced ${commentsSynced} comments and checked ${replyPagesFetched} reply page(s), using ${quotaUnits} quota unit(s). More pages are queued for the next incremental run.`
      : `Synced ${commentsSynced} comments and checked ${replyPagesFetched} reply page(s), using ${quotaUnits} quota unit(s), and reached the saved boundary.`;
    await prisma.adminYoutubeCommentSync.update({
      data: {
        commentsSynced,
        message,
        pagesFetched,
        quotaUnits,
        status: hasMorePages ? "catching_up" : "success",
        syncedAt: new Date(),
      },
      where: { id: SYNC_ID },
    });
    return {
      commentsSynced,
      estimatedQuotaUnits: quotaUnits,
      message,
      pagesFetched,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YouTube comment sync failed.";
    await prisma.adminYoutubeCommentSync.update({
      data: { message, status: "error", syncedAt: new Date() },
      where: { id: SYNC_ID },
    });
    throw new Error(message);
  }
}

async function fetchCommentThreads({
  accessToken,
  channelId,
  pageToken,
}: {
  accessToken: string;
  channelId: string;
  pageToken?: string;
}) {
  const params = new URLSearchParams({
    allThreadsRelatedToChannelId: channelId,
    maxResults: String(PAGE_SIZE),
    order: "time",
    part: "replies,snippet",
    textFormat: "plainText",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const response = await fetch(`${YOUTUBE_API_URL}/commentThreads?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response
    .json()
    .catch(() => null)) as CommentThreadResponse | null;
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.error?.error_description ||
        "YouTube comments could not be loaded.",
    );
  }
  return payload ?? {};
}

function parseCommentThread(thread: CommentThreadResource) {
  const topLevelComment = thread.snippet?.topLevelComment;
  const snippet = topLevelComment?.snippet;
  const videoId = thread.snippet?.videoId;
  const publishedAt = parseDate(snippet?.publishedAt);
  const updatedAt = parseDate(snippet?.updatedAt ?? snippet?.publishedAt);
  if (
    !thread.id ||
    !topLevelComment?.id ||
    !videoId ||
    !publishedAt ||
    !updatedAt
  ) {
    return null;
  }
  return {
    authorChannelId: snippet?.authorChannelId?.value ?? null,
    authorDisplayName: snippet?.authorDisplayName?.trim() || "Unknown viewer",
    authorProfileImageUrl: snippet?.authorProfileImageUrl ?? null,
    id: topLevelComment.id,
    likeCount: snippet?.likeCount ?? 0,
    publishedAt,
    replyCount: thread.snippet?.totalReplyCount ?? 0,
    text: snippet?.textOriginal ?? snippet?.textDisplay ?? "",
    threadId: thread.id,
    updatedAt,
    videoId,
  };
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getOwnerReplyStatus({
  accessToken,
  ownerChannelId,
  thread,
  topLevelCommentId,
  totalReplyCount,
}: {
  accessToken: string;
  ownerChannelId: string;
  thread: CommentThreadResource;
  topLevelCommentId: string;
  totalReplyCount: number;
}) {
  if (totalReplyCount === 0) {
    return { hasOwnerReply: false, pagesFetched: 0 };
  }

  const inlineReplies = thread.replies?.comments ?? [];
  if (inlineReplies.some((reply) => isOwnerAuthor(reply, ownerChannelId))) {
    return { hasOwnerReply: true, pagesFetched: 0 };
  }
  if (inlineReplies.length >= totalReplyCount) {
    return { hasOwnerReply: false, pagesFetched: 0 };
  }

  return fetchOwnerReplyStatus({
    accessToken,
    ownerChannelId,
    parentId: topLevelCommentId,
  });
}

async function fetchOwnerReplyStatus({
  accessToken,
  ownerChannelId,
  parentId,
  maxPages = 1000,
}: {
  accessToken: string;
  ownerChannelId: string;
  parentId: string;
  maxPages?: number;
}) {
  let pageToken: string | undefined;
  let pagesFetched = 0;
  let replyCount = 0;
  let hasOwnerReply = false;
  do {
    if (pagesFetched >= maxPages)
      throw new Error(
        "Reply status is unknown: reply pagination limit reached. Nothing is assumed unanswered.",
      );
    const payload = await fetchCommentReplies({
      accessToken,
      pageToken,
      parentId,
    });
    pagesFetched += 1;
    const replies = payload.items ?? [];
    if (replies.some((reply) => !reply.snippet?.authorChannelId?.value))
      throw new Error(
        "Reply status is unknown: a reply author could not be verified.",
      );
    replyCount += replies.length;
    hasOwnerReply ||= replies.some((reply) =>
      isOwnerAuthor(reply, ownerChannelId),
    );
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return { hasOwnerReply, pagesFetched, replyCount };
}

async function fetchCommentReplies({
  accessToken,
  pageToken,
  parentId,
}: {
  accessToken: string;
  pageToken?: string;
  parentId: string;
}) {
  const params = new URLSearchParams({
    maxResults: String(PAGE_SIZE),
    parentId,
    part: "snippet",
    textFormat: "plainText",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const response = await fetch(`${YOUTUBE_API_URL}/comments?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response
    .json()
    .catch(() => null)) as CommentListResponse | null;
  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(
      payload?.error?.message ||
        payload?.error?.error_description ||
        "YouTube comment replies could not be loaded.",
    );
  }
  return payload ?? {};
}

export function isOwnerAuthor(
  comment: CommentResource,
  ownerChannelId: string,
) {
  return comment.snippet?.authorChannelId?.value === ownerChannelId;
}

// Always refresh before AI generation/review/copy. A failed check is never an unanswered result.
export async function refreshAdminYoutubeComment(id: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");
  const stored = await prisma.adminYoutubeComment.findUniqueOrThrow({
    where: { id },
  });
  const connection = await getAdminYoutubeConnection();
  if (!connection)
    throw new Error("Connect your YouTube channel before checking replies.");
  const accessToken = await getYouTubeAccessToken(
    await getAdminYoutubeCredentials(),
    AbortSignal.timeout(15_000),
  );
  const params = new URLSearchParams({
    id: stored.threadId,
    part: "snippet",
    textFormat: "plainText",
  });
  const response = await fetch(`${YOUTUBE_API_URL}/commentThreads?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as CommentThreadResponse;
  if (!response.ok)
    throw new Error(
      payload.error?.message ||
        "Reply status is unknown: YouTube lookup failed.",
    );
  const thread = payload.items?.find(
    (item) => item.snippet?.topLevelComment?.id === id,
  );
  const current = thread && parseCommentThread(thread);
  if (
    !current ||
    thread?.snippet?.channelId !== connection.channelId ||
    current.videoId !== stored.videoId
  )
    throw new Error(
      "Reply status is unknown: comment missing, moved or not on the connected channel.",
    );
  if (
    !current.authorChannelId ||
    typeof thread?.snippet?.totalReplyCount !== "number"
  )
    throw new Error(
      "Reply status is unknown: comment author or reply count unavailable.",
    );
  const reply =
    current.replyCount === 0
      ? { hasOwnerReply: false, replyCount: 0 }
      : await fetchOwnerReplyStatus({
          accessToken,
          ownerChannelId: connection.channelId,
          parentId: id,
          maxPages: 3,
        });
  const comment = await prisma.adminYoutubeComment.update({
    where: { id },
    data: {
      text: current.text,
      updatedAt: current.updatedAt,
      authorChannelId: current.authorChannelId,
      authorDisplayName: current.authorDisplayName,
      hasOwnerReply: reply.hasOwnerReply,
      replyCount: reply.replyCount,
      ownerReplyCheckedAt: new Date(),
      syncedAt: new Date(),
    },
  });
  return {
    comment,
    ownerChannelId: connection.channelId,
    isOwn: comment.authorChannelId === connection.channelId,
  };
}
