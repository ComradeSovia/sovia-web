import { Prisma } from "@/generated/prisma/client";
import {
  type COMMENT_CATEGORIES,
  type COMMENT_REPLY_STATES,
  MANUAL_SOURCE_MODEL,
} from "../model/comment-review";
import { songRequestCueSql } from "./comment-request-cues";

type Category = (typeof COMMENT_CATEGORIES)[number];
type ReplyStatus = (typeof COMMENT_REPLY_STATES)[number];

export type InboxFilters = {
  category?: Category;
  replyStatus?: ReplyStatus;
  candidate?: boolean;
  unlinked?: boolean;
  contentId?: string;
  commentId?: string;
  hideOwn?: boolean;
  hideReplied?: boolean;
  ownerChannelId?: string | null;
  q?: string;
  unprocessedForChannel?: string;
};
export type InboxIndexRow = {
  id: string;
  effectiveCategory: Category;
  replyStatus: ReplyStatus;
  currentReviewId: string | null;
};

// The saved snapshot key uses JSON.stringify([text, videoId, authorChannelId, ISO date]).
// Hash the same scalar JSON values so a historical reply draft cannot hide an edited comment.
const sourceHash = Prisma.sql`encode(sha256(convert_to(concat(
  '[',to_json(c.text)::text,',',to_json(c."videoId")::text,',',
  coalesce(to_json(c."authorChannelId")::text,'null'),',',
  to_json(to_char(c."updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text,']'), 'UTF8')), 'hex')`;

export function commentInboxIndex(
  filters: InboxFilters,
  searchScope: "all" | "text" = "all",
) {
  const base: Prisma.Sql[] = [];
  if (filters.contentId)
    base.push(Prisma.sql`c."contentId" = ${filters.contentId}`);
  if (filters.commentId) base.push(Prisma.sql`c.id = ${filters.commentId}`);
  if (filters.hideReplied) base.push(Prisma.sql`NOT c."hasOwnerReply"`);
  if (filters.hideOwn) {
    if (filters.ownerChannelId)
      base.push(
        Prisma.sql`c."authorChannelId" IS DISTINCT FROM ${filters.ownerChannelId}`,
      );
    base.push(
      Prisma.sql`(c."authorChannelId" IS NOT NULL OR lower(trim(c."authorDisplayName")) NOT IN ('comradesovia','@comradesovia'))`,
    );
  }
  const q = filters.q?.trim();
  if (q) {
    const textMatches = Prisma.sql`strpos(lower(c.text), lower(${q})) > 0`;
    base.push(
      searchScope === "text"
        ? textMatches
        : Prisma.sql`(${textMatches} OR strpos(lower(c."authorDisplayName"), lower(${q})) > 0 OR strpos(lower(c."videoId"), lower(${q})) > 0)`,
    );
  }
  if (filters.unprocessedForChannel) {
    base.push(
      Prisma.sql`c."authorChannelId" IS DISTINCT FROM ${filters.unprocessedForChannel}`,
    );
    base.push(
      Prisma.sql`(review.id IS NULL OR review."ownerChannelId" <> ${filters.unprocessedForChannel} OR (review.model=${MANUAL_SOURCE_MODEL} AND review."reviewedAt" IS NULL AND review."dismissedAt" IS NULL))`,
    );
    if (!filters.candidate)
      base.push(Prisma.sql`NOT c."hasOwnerReply" AND c."noReplyAt" IS NULL`);
  }
  return Prisma.sql`WITH inbox AS (
    SELECT c.id, c."publishedAt", c."likeCount", c."replyCount", review.id AS "currentReviewId",
      COALESCE(c."categoryOverride"::text, NULLIF(review.category::text, 'UNCLASSIFIED'),
        CASE WHEN links.linked THEN 'SONG_REQUEST' ELSE 'UNCLASSIFIED' END) AS "effectiveCategory",
      CASE WHEN c."hasOwnerReply" THEN 'REPLIED'
        WHEN c."noReplyAt" IS NOT NULL THEN 'NO_REPLY'
        WHEN review."dismissedAt" IS NULL AND TRIM(review."replyText") <> '' THEN 'DRAFTED'
        ELSE 'UNREPLIED' END AS "replyStatus", links.linked,
      ${songRequestCueSql} AS cue
    FROM admin_youtube_comments c
    LEFT JOIN comment_reviews review ON review."commentId"=c.id AND review."sourceHash"=${sourceHash}
    CROSS JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM comment_reviews history
      JOIN comment_review_requests association ON association."reviewId"=history.id
      WHERE history."commentId"=c.id) AS linked) links
    ${base.length ? Prisma.sql`WHERE ${Prisma.join(base, " AND ")}` : Prisma.empty}
  )`;
}

export const possibleRequest = Prisma.sql`"effectiveCategory"='UNCLASSIFIED' AND NOT linked AND cue`;
export function commentInboxFilter(filters: InboxFilters) {
  const conditions: Prisma.Sql[] = [];
  if (filters.category)
    conditions.push(Prisma.sql`"effectiveCategory" = ${filters.category}`);
  if (filters.replyStatus)
    conditions.push(Prisma.sql`"replyStatus" = ${filters.replyStatus}`);
  if (filters.unlinked) conditions.push(Prisma.sql`NOT linked`);
  if (filters.candidate) conditions.push(possibleRequest);
  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}
