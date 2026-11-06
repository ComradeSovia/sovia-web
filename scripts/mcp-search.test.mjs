// No database or network access: execute the actual MCP projection against fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const dataUrl = new URL(
  "../src/features/admin/data/admin-mcp-data.ts",
  import.meta.url,
).href;
const inboxUrl = new URL(
  "../src/features/admin/data/review-inbox.ts",
  import.meta.url,
).href;
let workReads = 0;
const works = [
  {
    contentId: "song-a",
    title: "Kaine",
    path: "kaine",
    visible: true,
    fromArtists: ["Composer"],
    fromTitle: "Kaine",
    fromIp: "NieR",
  },
  {
    contentId: "song-b",
    title: "Kaine piano version",
    path: "kaine-piano",
    visible: false,
    fromArtists: ["Composer"],
    fromIp: "NieR",
  },
  {
    contentId: "song-c",
    title: "Other song",
    path: "other",
    visible: true,
    fromArtists: ["Someone else"],
  },
];
let queue = [];
const matches = (row, where) => {
  if (where.status?.in && !where.status.in.includes(row.status)) return false;
  if (typeof where.status === "string" && where.status !== row.status)
    return false;
  if (where.id?.not && row.id === where.id.not) return false;
  if (where.id?.gt && row.id <= where.id.gt) return false;
  if (where.createdAt instanceof Date && +row.createdAt !== +where.createdAt)
    return false;
  if (where.createdAt?.gt && +row.createdAt <= +where.createdAt.gt)
    return false;
  if (where.OR && !where.OR.some((condition) => matches(row, condition)))
    return false;
  return true;
};
const table = {
  async findUnique({ where }) {
    return queue.find((row) => row.id === where.id) ?? null;
  },
  async findFirst({ where }) {
    return (
      queue
        .filter((row) => matches(row, where))
        .sort(
          (a, b) => +a.createdAt - +b.createdAt || a.id.localeCompare(b.id),
        )[0] ?? null
    );
  },
};
globalThis.__mcpReadFixtures = {
  listWorks: async () => {
    workReads++;
    return works;
  },
  db: { songRequest: table, musicPlanningDraft: table, commentReview: table },
};
const unavailable = (names) =>
  names
    .map(
      (name) =>
        `export function ${name}() { throw new Error("Unexpected dependency call: ${name}"); }`,
    )
    .join("\n");
const dependencies = {
  "./analytics-intelligence": unavailable([
    "getChannelIntelligence",
    "getContentStrategy",
    "getPublishAgeIntelligence",
  ]),
  "./analytics-math": `export const ANALYTICS_TIMEZONE = "America/Los_Angeles"; ${unavailable(["isCompletePublishWindow"])}`,
  "./music-admin":
    "export const listAdminMusicWorks = () => globalThis.__mcpReadFixtures.listWorks();",
  "./youtube-analytics": unavailable([
    "getYoutubeAnalyticsSyncStatus",
    "listLatestYoutubeAnalyticsSnapshots",
    "listLatestYoutubeEarlyPerformanceSnapshots",
    "listLatestYoutubeTrafficSourceSnapshots",
    "listYoutubeRetentionSnapshots",
  ]),
  "./youtube-comments": unavailable([
    "getAdminYoutubeCommentSyncStatus",
    "listAdminYoutubeComments",
  ]),
  "./youtube-connection": unavailable(["getAdminYoutubeConnection"]),
  "./song-requests":
    "export const planningPrisma = () => globalThis.__mcpReadFixtures.db;",
  "./comment-source": unavailable(["commentHash"]),
};
registerHooks({
  resolve(specifier, context, next) {
    if (
      [dataUrl, inboxUrl].includes(context.parentURL) &&
      specifier.startsWith("./")
    ) {
      assert.ok(
        Object.hasOwn(dependencies, specifier),
        `Unexpected MCP dependency: ${specifier}`,
      );
      return {
        url: `data:text/javascript,${encodeURIComponent(dependencies[specifier])}`,
        shortCircuit: true,
      };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if ([dataUrl, inboxUrl].includes(url)) {
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    }
    return next(url, context);
  },
});
const { searchAdminMcpContentWorks } = await import(dataUrl);
const { nextReviewPath } = await import(inboxUrl);

test("MCP search defaults to lexical ranking without embedding or network dependencies", async () => {
  const result = await searchAdminMcpContentWorks({ q: "Kaine", limit: 1 });
  assert.equal(result.count, 2);
  assert.equal(result.items[0].contentId, "song-a");
  assert.equal(result.search.mode, "lexical");
  assert.equal(result.filters.matchMode, "lexical");
  assert.equal(result.search.generatedEmbeddingCount, 0);
  assert.equal(result.search.semanticAvailable, false);
  assert.equal(result.items[0].searchMatch.confidence, "high");
});

test("MCP search rejects semantic and hybrid before reading content", async () => {
  const before = workReads;
  for (const matchMode of ["semantic", "hybrid", "unexpected"]) {
    await assert.rejects(
      searchAdminMcpContentWorks({ q: "Kaine", matchMode }),
      /lexical only/,
    );
  }
  assert.equal(workReads, before);
});

test("MCP lexical search retains filters, pagination and exact identifier confidence", async () => {
  const filtered = await searchAdminMcpContentWorks({
    q: "Kaine",
    visible: false,
  });
  assert.equal(filtered.count, 1);
  assert.equal(filtered.items[0].contentId, "song-b");
  const page = await searchAdminMcpContentWorks({
    q: "Kaine",
    offset: 1,
    limit: 1,
  });
  assert.equal(page.items[0].contentId, "song-b");
  const exact = await searchAdminMcpContentWorks({ q: "song-a" });
  assert.equal(exact.items[0].searchMatch.requiresConfirmation, false);
  const all = await searchAdminMcpContentWorks({});
  assert.equal(all.count, 3);
  assert.equal(all.search.mode, "lexical");
});

test("saving pending items advances through the queue without A/B loops", async () => {
  const createdAt = new Date("2026-11-04T00:00:00Z");
  queue = ["a", "b", "c"].map((id) => ({ id, createdAt, status: "DRAFT" }));
  assert.equal(await nextReviewPath("drafts", "a"), "/admin/planning-drafts/b");
  assert.equal(await nextReviewPath("drafts", "b"), "/admin/planning-drafts/c");
  assert.equal(await nextReviewPath("drafts", "c"), "/admin/review");
  assert.equal(await nextReviewPath("drafts", "missing"), "/admin/review");
});

test("the next pending item follows an approved record's retained cursor", async () => {
  queue = [
    {
      id: "z",
      createdAt: new Date("2026-11-03T00:00:00Z"),
      status: "ACCEPTED",
    },
    { id: "a", createdAt: new Date("2026-11-04T00:00:00Z"), status: "PENDING" },
    {
      id: "b",
      createdAt: new Date("2026-11-04T00:00:00Z"),
      status: "REJECTED",
    },
    {
      id: "c",
      createdAt: new Date("2026-11-04T00:00:00Z"),
      status: "NEEDS_INFO",
    },
  ];
  assert.equal(await nextReviewPath("requests", "z"), "/admin/requests/a");
  assert.equal(await nextReviewPath("requests", "a"), "/admin/requests/c");
});
