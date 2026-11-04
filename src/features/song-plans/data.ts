import { createHash } from "node:crypto";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { PlanSort, PlanTab, PublicPlan, SongSuggestions } from "./model";
import { songSuggestionQuery, suggestionArtist } from "./suggestion-query";

export const VOTE_COOKIE = "sovia-plan-voter";
export const RECENT_DAYS = 7;
const PAGE_SIZE = 18;
const tabStatuses = {
  pool: ["PROPOSED", "PLANNING"],
  production: ["IN_PRODUCTION", "PAUSED"],
  completed: ["COMPLETED"],
} as const;

export function voterHash(token?: string) {
  return token &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      token,
    )
    ? createHash("sha256").update(`sovia-plan-vote:${token}`).digest("hex")
    : null;
}
export function publicPlansPrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable");
  return prisma;
}
const publicWhere = { visible: true, status: { not: "CANCELLED" as const } };
function publicSelect(voterId: string | null) {
  return {
    id: true,
    title: true,
    sourceArtists: true,
    from: true,
    sourceUrl: true,
    publicSummary: true,
    status: true,
    completedAt: true,
    votes: {
      where: { active: true, voterId: voterId ?? "" },
      select: { voterId: true },
      take: 1,
    },
    _count: {
      select: {
        votes: { where: { active: true } },
        requests: { where: { request: { status: "ACCEPTED" as const } } },
      },
    },
    works: {
      where: {
        work: {
          status: { visible: true, publishedAt: { not: null } },
          platforms: { some: { platform: "youtube", platformId: { not: "" } } },
        },
      },
      select: {
        match: true,
        work: {
          select: {
            contentId: true,
            path: true,
            content: { select: { songTitle: true } },
            status: { select: { publishedAt: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" as const },
    },
  } satisfies Prisma.AdminMusicTodoSelect;
}
type PublicRow = Prisma.AdminMusicTodoGetPayload<{
  select: ReturnType<typeof publicSelect>;
}>;
function toPublicPlan(
  row: PublicRow,
  voterId: string | null,
  recent: number,
): PublicPlan {
  return {
    id: row.id,
    title: row.title,
    artist: row.sourceArtists,
    origin: row.from === "Contact page" ? null : row.from,
    reference:
      row.sourceUrl && /^https?:\/\//i.test(row.sourceUrl)
        ? row.sourceUrl
        : null,
    summary: row.publicSummary,
    status: row.status as PublicPlan["status"],
    completedAt: row.completedAt?.toISOString() ?? null,
    supports: row._count.votes,
    recent,
    supported: row.votes.some((vote) => vote.voterId === voterId),
    requestCount: row._count.requests,
    works: row.works
      .filter(({ work }) => work.status?.publishedAt?.trim())
      .map(({ work, match }) => ({
        title: work.content?.songTitle || row.title,
        path: work.path || work.contentId,
        match,
      })),
  };
}

export async function listPublicPlans({
  tab,
  sort,
  q = "",
  page = 1,
  voterId = null,
  now = new Date(),
}: {
  tab: PlanTab;
  sort: PlanSort;
  q?: string;
  page?: number;
  voterId?: string | null;
  now?: Date;
}) {
  const prisma = publicPlansPrisma();
  const statuses = tabStatuses[tab];
  const pattern = `%${q}%`;
  const search = q
    ? Prisma.sql`AND (p.title ILIKE ${pattern} OR p."sourceArtists" ILIKE ${pattern} OR p."from" ILIKE ${pattern} OR p."publicSummary" ILIKE ${pattern})`
    : Prisma.empty;
  const order =
    sort === "support"
      ? Prisma.sql`supports DESC, recent DESC`
      : sort === "recent"
        ? Prisma.sql`recent DESC, supports DESC`
        : tab === "completed"
          ? Prisma.sql`p."completedAt" DESC NULLS LAST`
          : Prisma.sql`p."createdAt" DESC`;
  const [ranking, total, counts] = await Promise.all([
    prisma.$queryRaw<{ id: string; recent: number }[]>(Prisma.sql`
      SELECT p.id, count(v."planId") FILTER (WHERE v.active)::int AS supports,
        count(v."planId") FILTER (WHERE v.active AND v."createdAt" >= ${new Date(now.getTime() - RECENT_DAYS * 86400000)})::int AS recent
      FROM admin_music_todos p LEFT JOIN music_plan_votes v ON v."planId" = p.id
      WHERE p.visible = true AND p.status::text IN (${Prisma.join(statuses)}) ${search}
      GROUP BY p.id ORDER BY ${order}, p."createdAt" DESC, p.id ASC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`),
    prisma.adminMusicTodo.count({
      where: {
        visible: true,
        status: { in: [...statuses] },
        ...(q
          ? {
              OR: ["title", "sourceArtists", "from", "publicSummary"].map(
                (key) => ({ [key]: { contains: q, mode: "insensitive" } }),
              ),
            }
          : {}),
      },
    }),
    prisma.adminMusicTodo.groupBy({
      by: ["status"],
      where: publicWhere,
      _count: true,
    }),
  ]);
  const rows = await prisma.adminMusicTodo.findMany({
    where: { ...publicWhere, id: { in: ranking.map(({ id }) => id) } },
    select: publicSelect(voterId),
  });
  const recentById = new Map(ranking.map((row) => [row.id, row.recent]));
  const byId = new Map(
    rows.map((row) => [
      row.id,
      toPublicPlan(row, voterId, recentById.get(row.id) ?? 0),
    ]),
  );
  return {
    items: ranking.flatMap(({ id }) =>
      byId.has(id) ? [byId.get(id) as PublicPlan] : [],
    ),
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts: Object.fromEntries(
      Object.entries(tabStatuses).map(([key, values]) => [
        key,
        counts
          .filter((entry) =>
            (values as readonly string[]).includes(entry.status),
          )
          .reduce((sum, entry) => sum + entry._count, 0),
      ]),
    ) as Record<PlanTab, number>,
  };
}

export async function getPublicPlan(id: string, voterId: string | null = null) {
  const now = new Date();
  const prisma = publicPlansPrisma();
  const row = await prisma.adminMusicTodo.findFirst({
    where: { id, ...publicWhere },
    select: publicSelect(voterId),
  });
  if (!row) return null;
  const recent = await prisma.musicPlanVote.count({
    where: {
      planId: id,
      active: true,
      createdAt: { gte: new Date(now.getTime() - RECENT_DAYS * 86400000) },
    },
  });
  return toPublicPlan(row, voterId, recent);
}

export async function getPublicPlanSitemapEntries() {
  const prisma = getPrismaClient();
  if (!prisma) return [];
  return prisma.adminMusicTodo.findMany({
    where: publicWhere,
    select: { id: true, updatedAt: true },
  });
}

export async function findPublicSongSuggestions(
  title: string,
  artist = "",
  voterId: string | null = null,
): Promise<SongSuggestions> {
  const query = songSuggestionQuery(title);
  if (!query) return { plans: [], works: [] };
  const db = publicPlansPrisma();
  const [plans, works] = await Promise.all([
    db.adminMusicTodo.findMany({
      where: {
        ...publicWhere,
        title: { contains: query, mode: "insensitive" },
      },
      select: publicSelect(voterId),
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    db.musicWork.findMany({
      where: {
        status: { visible: true, publishedAt: { not: null } },
        platforms: { some: { platform: "youtube", platformId: { not: "" } } },
        OR: [
          { content: { songTitle: { contains: query, mode: "insensitive" } } },
          { source: { title: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        contentId: true,
        path: true,
        content: { select: { songTitle: true } },
        source: { select: { title: true, artists: true } },
        status: { select: { publishedAt: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
  ]);
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().toLocaleLowerCase();
  const score = (name: string, creators: string | null) =>
    (normalize(name) === normalize(query) ? 2 : 0) +
    (artist.trim() &&
    creators &&
    normalize(creators).includes(normalize(artist))
      ? 1
      : 0);
  const selected = plans
    .sort(
      (a, b) =>
        score(b.title, b.sourceArtists) - score(a.title, a.sourceArtists),
    )
    .slice(0, 3);
  const recent = selected.length
    ? await db.musicPlanVote.groupBy({
        by: ["planId"],
        where: {
          planId: { in: selected.map((p) => p.id) },
          active: true,
          createdAt: { gte: new Date(Date.now() - RECENT_DAYS * 86400000) },
        },
        _count: { _all: true },
      })
    : [];
  return {
    plans: selected.map((row) =>
      toPublicPlan(
        row,
        voterId,
        recent.find((r) => r.planId === row.id)?._count._all ?? 0,
      ),
    ),
    works: works
      .filter((w) => w.status?.publishedAt?.trim())
      .map((w) => ({
        title: w.content?.songTitle || w.source?.title || w.contentId,
        artist: suggestionArtist(w.source?.artists),
        origin: w.source?.title || null,
        path: w.path || w.contentId,
      }))
      .sort((a, b) => score(b.title, b.artist) - score(a.title, a.artist))
      .slice(0, 3),
  };
}

export class VoteError extends Error {
  constructor(public code: "unavailable" | "rateLimited") {
    super(code);
  }
}
export async function setPlanSupport(
  planId: string,
  voterId: string,
  supported: boolean,
  networkKey?: string,
  now = new Date(),
) {
  const prisma = publicPlansPrisma();
  const window = new Date(Math.floor(now.getTime() / 60000) * 60000);
  // Always lock rate buckets in this order before locking a plan.
  await prisma.$transaction(async (tx) => {
    for (const [key, maximum] of [
      ["global", 600],
      [`voter:${voterId}`, 20],
      ...(networkKey ? [[`network:${networkKey}`, 60] as const] : []),
    ] as const) {
      const bucket = await tx.musicPlanVoteLimit.upsert({
        where: { key_window: { key, window } },
        create: { key, window, count: 1 },
        update: { count: { increment: 1 } },
      });
      if (bucket.count > maximum) throw new VoteError("rateLimited");
    }
    await tx.musicPlanVoteLimit.deleteMany({
      where: { window: { lt: new Date(now.getTime() - 86400000) } },
    });
  });
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${planId} FOR UPDATE`;
    const plan = await tx.adminMusicTodo.findFirst({
      where: { id: planId, ...publicWhere },
      select: { id: true },
    });
    if (!plan) throw new VoteError("unavailable");
    const key = { planId, voterId };
    const existing = await tx.musicPlanVote.findUnique({
      where: { planId_voterId: key },
    });
    if (supported)
      await tx.musicPlanVote.upsert({
        where: { planId_voterId: key },
        create: { ...key, createdAt: now },
        update: { active: true },
      });
    else if (existing?.active)
      await tx.musicPlanVote.update({
        where: { planId_voterId: key },
        data: { active: false },
      });
    const supports = await tx.musicPlanVote.count({
      where: { planId, active: true },
    });
    const recent = await tx.musicPlanVote.count({
      where: {
        planId,
        active: true,
        createdAt: { gte: new Date(now.getTime() - RECENT_DAYS * 86400000) },
      },
    });
    // These are derived caches only. Do not change the editor's updatedAt version.
    await tx.$executeRaw`UPDATE admin_music_todos SET "voteCount" = ${supports}, "heatScore" = ${recent}, "lastVotedAt" = CASE WHEN ${supported && !existing} THEN ${now} ELSE "lastVotedAt" END WHERE id = ${planId}`;
    return { supports, recent, supported };
  });
}
