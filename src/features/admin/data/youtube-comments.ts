import { getPrismaClient } from "@sovia/sound/data/prisma";
import { getYouTubeAccessToken } from "@sovia/youtube-api";
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
const OWN_CHANNEL_HANDLE = "comradesovia";

type CommentThreadResponse = {
  error?: { error_description?: string; message?: string };
  items?: CommentThreadResource[];
  nextPageToken?: string;
};

type CommentThreadResource = {
  id?: string;
  snippet?: {
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

export async function listAdminYoutubeComments({
  contentId,
  limit = 50,
  offset = 0,
  q,
}: {
  contentId?: string;
  limit?: number;
  offset?: number;
  q?: string;
} = {}) {
  const prisma = getPrismaClient();
  if (!prisma) return { items: [], total: 0 };
  const query = q?.trim();
  const connection = await getAdminYoutubeConnection();
  const where = {
    ...(contentId ? { contentId } : {}),
    NOT: {
      OR: [
        {
          authorDisplayName: {
            equals: "@ComradeSovia",
            mode: "insensitive" as const,
          },
        },
        {
          authorDisplayName: {
            equals: "ComradeSovia",
            mode: "insensitive" as const,
          },
        },
        ...(connection?.channelId
          ? [{ authorChannelId: connection.channelId }]
          : []),
      ],
    },
    ...(query
      ? {
          OR: [
            { text: { contains: query, mode: "insensitive" as const } },
            {
              authorDisplayName: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            { videoId: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.adminYoutubeComment.findMany({
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      skip: Math.max(0, offset),
      take: Math.min(100, Math.max(1, limit)),
      where,
    }),
    prisma.adminYoutubeComment.count({ where }),
  ]);
  return { items, total };
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
    let commentsSynced = 0;
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
        if (isOwnChannelComment(parsed, connection.channelId)) continue;
        const contentId = contentIdByVideoId.get(parsed.videoId);
        if (!contentId) continue;

        await prisma.adminYoutubeComment.upsert({
          create: { ...parsed, contentId },
          update: {
            authorChannelId: parsed.authorChannelId,
            authorDisplayName: parsed.authorDisplayName,
            authorProfileImageUrl: parsed.authorProfileImageUrl,
            likeCount: parsed.likeCount,
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

    const hasMorePages = Boolean(pageToken && !reachedPreviousBoundary);
    const message = hasMorePages
      ? `Synced ${commentsSynced} top-level comments from ${pagesFetched} page(s). More pages are queued for the next incremental run.`
      : `Synced ${commentsSynced} top-level comments from ${pagesFetched} page(s) and reached the saved boundary.`;
    await prisma.adminYoutubeCommentSync.update({
      data: {
        commentsSynced,
        message,
        pagesFetched,
        quotaUnits: pagesFetched,
        status: hasMorePages ? "catching_up" : "success",
        syncedAt: new Date(),
      },
      where: { id: SYNC_ID },
    });
    return {
      commentsSynced,
      estimatedQuotaUnits: pagesFetched,
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
    part: "snippet",
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

function isOwnChannelComment(
  comment: NonNullable<ReturnType<typeof parseCommentThread>>,
  channelId: string,
) {
  return (
    comment.authorChannelId === channelId ||
    normalizeYoutubeHandle(comment.authorDisplayName) === OWN_CHANNEL_HANDLE
  );
}

function normalizeYoutubeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLocaleLowerCase("en-US");
}
