// Run: node --test scripts/music-planning.test.mjs
// Uses the configured local database; creates and removes only its own fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    let target;
    if (specifier.startsWith("@/")) target = `${root}src/${specifier.slice(2)}`;
    else if (specifier.startsWith("@sovia/"))
      target = `${root}src/features/${specifier.slice(7)}`;
    else if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:")
    )
      target = fileURLToPath(new URL(specifier, context.parentURL));
    if (target) {
      const file = [target, `${target}.ts`, `${target}/index.ts`].find(
        (path) => existsSync(path) && /\.ts$/.test(path),
      );
      if (file) return next(pathToFileURL(file).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (
      url.startsWith("file:") &&
      url.endsWith(".ts") &&
      !url.includes("node_modules")
    ) {
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
if (existsSync(`${root}.env`)) loadEnvFile(`${root}.env`);
const { planningPrisma, reviewSongRequest, linkPlanWork, planFields } =
  await import("../src/features/admin/data/song-requests.ts");
const {
  startAdminMusicTodo,
  syncAdminMusicTodoPublicationStatus,
  deleteAdminMusicTodo,
} = await import("../src/features/admin/data/music-todos.ts");
const { upsertMusicWork, deleteMusicWorkByContentId } = await import(
  "../src/features/sound/data/music-repository.ts"
);
const {
  listPublicPlans,
  getPublicPlan,
  setPlanSupport,
  voterHash,
  findPublicSongSuggestions,
} = await import("../src/features/song-plans/data.ts");
const {
  saveNewPlanningDraft,
  updatePlanningDraft,
  adoptPlanningDraft,
  refreshPlanningDraftRequest,
} = await import("../src/features/admin/data/planning-drafts.ts");
const { parsePlanningOutput } = await import(
  "../src/features/admin/data/todo-proposal-analyzer.ts"
);
const { requestSourceText } = await import(
  "../src/features/admin/model/planning-proposals.ts"
);
const { reviewItems, nextReviewPath } = await import(
  "../src/features/admin/data/review-inbox.ts"
);
const { commentHash } = await import(
  "../src/features/admin/data/comment-source.ts"
);
const { getPlanReadiness } = await import(
  "../src/features/admin/model/plan-readiness.ts"
);

test("publication reminders preserve legacy editing and distinguish historical completion from a new completion claim", () => {
  const base = {
    title: "Legacy song",
    artist: "",
    origin: "Contact page",
    direction: "",
    summary: "",
    status: "PLANNING",
    visible: true,
    hasPublishedFullWork: false,
    hasPublicWork: false,
    wasCompleted: false,
  };
  assert.ok(!getPlanReadiness(base).some((c) => c.level === "blocking"));
  assert.ok(
    getPlanReadiness(base).filter((c) => c.level === "warning").length >= 3,
  );
  assert.ok(
    getPlanReadiness({ ...base, status: "COMPLETED" }).some(
      (c) => c.key === "completion" && c.level === "blocking",
    ),
  );
  assert.ok(
    !getPlanReadiness({
      ...base,
      status: "COMPLETED",
      wasCompleted: true,
    }).some((c) => c.level === "blocking"),
  );
  assert.ok(
    !getPlanReadiness({
      ...base,
      status: "COMPLETED",
      hasPublishedFullWork: true,
      hasPublicWork: true,
    }).some((c) => c.level === "blocking"),
  );
  assert.ok(
    getPlanReadiness({ ...base, title: " " }).some(
      (c) => c.key === "title" && c.level === "blocking",
    ),
  );
});

test("song suggestions include only public plans and playable published Works", async () => {
  const db = planningPrisma();
  const prefix = `suggestion-test-${randomUUID()}`;
  const ids = ["public", "private", "cancelled"].map((s) => `${prefix}-${s}`);
  const workIds = ["published", "draft", "hidden"].map(
    (s) => `${prefix}-${s}-work`,
  );
  try {
    await db.adminMusicTodo.createMany({
      data: ids.map((id, i) => ({
        id,
        title: id,
        visible: i !== 1,
        status: i === 2 ? "CANCELLED" : "PLANNING",
        sourceArtists: "Test artist",
        notes: "PRIVATE PLAN NOTES",
        publicSummary: "Public introduction",
      })),
    });
    for (const [i, contentId] of workIds.entries())
      await db.musicWork.create({
        data: {
          contentId,
          workType: "R",
          content: {
            create: {
              songTitle: contentId,
              productionNotes: "PRIVATE WORK NOTES",
            },
          },
          platforms: { create: { platform: "youtube", platformId: contentId } },
          status: {
            create: {
              visible: i !== 2,
              publishedAt: i === 1 ? null : "2026-10-29",
            },
          },
        },
      });
    const suggestions = await findPublicSongSuggestions(prefix);
    assert.deepEqual(
      suggestions.plans.map((p) => p.id),
      [ids[0]],
    );
    assert.deepEqual(
      suggestions.works.map((w) => w.path),
      [workIds[0]],
    );
    assert.ok(!JSON.stringify(suggestions).includes("PRIVATE"));
    assert.deepEqual(await findPublicSongSuggestions(ids[1]), {
      plans: [],
      works: [],
    });
    assert.deepEqual(await findPublicSongSuggestions("%_\\"), {
      plans: [],
      works: [],
    });
  } finally {
    await db.adminMusicTodo.deleteMany({ where: { id: { in: ids } } });
    await db.musicWork.deleteMany({ where: { contentId: { in: workIds } } });
    await db.reviewAuditEvent.deleteMany({
      where: { title: { contains: prefix } },
    });
    await db.$disconnect();
  }
});

test("review inbox advances past the current record and keeps copied replies pending until owner reply confirmation", async () => {
  const db = planningPrisma();
  const prefix = `inbox-test-${randomUUID()}`;
  const requestIds = ["first", "second", "closed"].map((s) => `${prefix}-${s}`);
  const commentId = `${prefix}-comment`,
    reviewId = `${prefix}-review`;
  try {
    await db.songRequest.createMany({
      data: requestIds.map((id, index) => ({
        id,
        title: prefix,
        status: ["PENDING", "NEEDS_INFO", "ARCHIVED"][index],
        createdAt: new Date(`190${index}-01-01T00:00:00Z`),
      })),
    });
    assert.equal(
      await nextReviewPath("requests", requestIds[0]),
      `/admin/requests/${requestIds[1]}`,
    );
    const queue = await reviewItems("requests");
    assert.equal(queue[0].id, requestIds[0]);
    assert.ok(!queue.some((r) => r.id === requestIds[2]));
    const work = await db.musicWork.findFirstOrThrow({
      select: { contentId: true },
    });
    const comment = await db.adminYoutubeComment.create({
      data: {
        id: commentId,
        threadId: commentId,
        contentId: work.contentId,
        videoId: prefix,
        authorDisplayName: "UI test",
        authorChannelId: prefix,
        text: "A synthetic reply follow-up",
        publishedAt: new Date(),
        updatedAt: new Date(),
        hasOwnerReply: false,
        ownerReplyCheckedAt: new Date(),
      },
    });
    await db.commentReview.create({
      data: {
        id: reviewId,
        commentId,
        sourceHash: commentHash(comment),
        sourceText: comment.text,
        sourceUrl: "https://www.youtube.com/watch?v=test",
        sourceVersion: comment.updatedAt,
        ownerChannelId: "test-owner",
        proposals: [],
        replyText: "Reviewed reply, copied but not posted.",
        rationale: "test",
        model: "test",
        promptKey: "test",
        reviewedAt: new Date(),
        replyApprovedAt: new Date(),
        copiedAt: new Date(),
        createdAt: new Date("1900-01-01T00:00:00Z"),
      },
    });
    assert.equal(
      (await reviewItems("replies")).find((r) => r.id === reviewId)?.state,
      "Copied · verify reply on YouTube",
    );
    assert.ok(!(await reviewItems("comments")).some((r) => r.id === reviewId));
    await db.adminYoutubeComment.update({
      where: { id: commentId },
      data: { ownerReplyCheckedAt: null },
    });
    assert.match(
      (await reviewItems("replies")).find((r) => r.id === reviewId)?.warning ||
        "",
      /unknown/,
    );
    await db.adminYoutubeComment.update({
      where: { id: commentId },
      data: { text: "Edited original comment" },
    });
    assert.match(
      (await reviewItems("replies")).find((r) => r.id === reviewId)?.warning ||
        "",
      /Source edited/,
    );
    await db.adminYoutubeComment.update({
      where: { id: commentId },
      data: { hasOwnerReply: true, ownerReplyCheckedAt: new Date() },
    });
    assert.ok(!(await reviewItems("replies")).some((r) => r.id === reviewId));
  } finally {
    await db.commentReview.deleteMany({ where: { id: reviewId } });
    await db.adminYoutubeComment.deleteMany({ where: { id: commentId } });
    await db.songRequest.deleteMany({ where: { id: { in: requestIds } } });
    await db.reviewAuditEvent.deleteMany({
      where: { title: { contains: prefix } },
    });
    await db.$disconnect();
  }
});

test("AI drafts preserve evidence and edits, merge atomically, reject stale sources and adopt idempotently", async () => {
  const prisma = planningPrisma();
  const prefix = `draft-test-${randomUUID()}`;
  const draftIds = [];
  const originalRequestId = `${prefix}-original`;
  const existingPlanId = `${prefix}-existing`;
  const source = `${prefix} One by Artist: please make a piano version.\n${prefix} One by Artist: please keep the melody.\n${prefix} Two by Artist: make it acoustic.`;
  const metadata = {
    sourceText: source,
    sourceName: prefix,
    sourceUrl: "",
    requestId: null,
    requestVersion: null,
    model: "test-model",
    promptKey: "test-prompt",
  };
  const fields = (title, quote) => ({
    title,
    from: "",
    sourceArtists: "Artist",
    sourceUrl: "",
    requestedChanges: "Piano",
    notes: "Arrange piano",
    publicSummary: "Public direction",
    missingInfo: "Origin unknown",
    evidenceQuotes: [quote],
  });
  try {
    const empty = parsePlanningOutput('{"proposals":[]}', metadata);
    assert.equal(empty.proposals.length, 0);
    assert.throws(
      () =>
        parsePlanningOutput(
          JSON.stringify({
            proposals: [
              {
                ...fields(
                  `${prefix} One`,
                  `${prefix} One by Artist: please make a piano version.`,
                ),
                notes: "",
              },
            ],
          }),
          metadata,
        ),
      /production direction/,
    );
    assert.throws(
      () =>
        parsePlanningOutput(
          JSON.stringify({
            proposals: [fields(`${prefix} One`, "fabricated quote")],
          }),
          metadata,
        ),
      /verified/,
    );
    assert.throws(
      () =>
        parsePlanningOutput(
          JSON.stringify({
            proposals: [
              {
                ...fields(
                  `${prefix} One`,
                  `${prefix} One by Artist: please make a piano version.`,
                ),
                sourceUrl: "https://example.com/invented",
              },
            ],
          }),
          metadata,
        ),
      /absent/,
    );
    const preview = parsePlanningOutput(
      JSON.stringify({
        proposals: [
          fields(
            `${prefix} One`,
            `${prefix} One by Artist: please make a piano version.`,
          ),
          fields(
            `${prefix} One`,
            `${prefix} One by Artist: please keep the melody.`,
          ),
          fields(`${prefix} Two`, `${prefix} Two by Artist: make it acoustic.`),
        ],
      }),
      metadata,
    );
    const saved = await saveNewPlanningDraft(preview);
    draftIds.push(saved.draftId);
    assert.equal(
      await prisma.adminMusicTodo.count({
        where: { title: { startsWith: prefix } },
      }),
      0,
      "saving a draft creates no plans",
    );
    assert.equal(
      await prisma.songRequest.count({
        where: { sourceDraftId: saved.draftId },
      }),
      0,
      "saving a draft creates no requests",
    );
    let draft = await prisma.musicPlanningDraft.findUniqueOrThrow({
      where: { id: saved.draftId },
    });
    const edited = preview.proposals.map((p, index) => ({
      ...p,
      notes: "Reviewed human edit",
      ...(index === 1
        ? { decision: "same", target: preview.proposals[0].key }
        : {}),
    }));
    draft = await updatePlanningDraft(draft.id, draft.version, edited);
    await assert.rejects(
      updatePlanningDraft(draft.id, 1, edited),
      /another tab/,
    );
    const duplicateSave = await saveNewPlanningDraft(preview);
    assert.equal(duplicateSave.draftId, draft.id);
    assert.equal(
      (
        await prisma.musicPlanningDraft.findUniqueOrThrow({
          where: { id: draft.id },
        })
      ).proposals[0].notes,
      "Reviewed human edit",
      "re-import preserves edits",
    );
    await prisma.adminMusicTodo.create({
      data: {
        id: existingPlanId,
        title: `${prefix} Two`,
        sourceArtists: "Artist",
        notes: "Keep existing plan notes",
      },
    });
    await assert.rejects(
      adoptPlanningDraft(draft.id, draft.version),
      /matching song/,
    );
    assert.equal(
      await prisma.adminMusicTodo.count({ where: { title: `${prefix} One` } }),
      0,
      "duplicate failure rolls back earlier creates",
    );
    assert.equal(
      await prisma.songRequest.count({ where: { sourceDraftId: draft.id } }),
      0,
    );
    edited[2] = { ...edited[2], decision: "merge", target: existingPlanId };
    draft = await updatePlanningDraft(draft.id, draft.version, edited);
    const ids = await adoptPlanningDraft(draft.id, draft.version);
    assert.equal(ids.length, 2);
    assert.deepEqual(
      [...(await adoptPlanningDraft(draft.id, 1))].sort(),
      [...ids].sort(),
      "retry returns original plans",
    );
    assert.equal(
      await prisma.songRequest.count({ where: { sourceDraftId: draft.id } }),
      3,
    );
    assert.equal(
      (
        await prisma.adminMusicTodo.findUniqueOrThrow({
          where: { id: existingPlanId },
        })
      ).notes,
      "Keep existing plan notes",
    );
    const newPlan = await prisma.adminMusicTodo.findFirstOrThrow({
      where: { title: `${prefix} One` },
    });
    assert.equal(newPlan.visible, false);
    assert.equal(
      await prisma.songRequestPlan.count({ where: { planId: newPlan.id } }),
      2,
    );
    await assert.rejects(
      updatePlanningDraft(draft.id, draft.version, edited),
      /read-only/,
    );

    const request = await prisma.songRequest.create({
      data: {
        id: originalRequestId,
        title: `${prefix} Two`,
        artist: "Artist",
        ideas: "Please make it acoustic",
      },
    });
    const singleMeta = {
      ...metadata,
      sourceText: requestSourceText(request).trim(),
      requestId: request.id,
      requestVersion: request.updatedAt.toISOString(),
    };
    const singlePreview = parsePlanningOutput(
      JSON.stringify({
        proposals: [fields(`${prefix} Two`, "Please make it acoustic")],
      }),
      singleMeta,
    );
    const singleSaved = await saveNewPlanningDraft(singlePreview);
    draftIds.push(singleSaved.draftId);
    let single = await prisma.musicPlanningDraft.findUniqueOrThrow({
      where: { id: singleSaved.draftId },
    });
    single = await updatePlanningDraft(
      single.id,
      single.version,
      singlePreview.proposals.map((p) => ({
        ...p,
        decision: "merge",
        target: existingPlanId,
      })),
    );
    await prisma.songRequest.update({
      where: { id: originalRequestId },
      data: { status: "NEEDS_INFO" },
    });
    await assert.rejects(
      adoptPlanningDraft(single.id, single.version),
      /original request/,
    );
    single = await refreshPlanningDraftRequest(single.id, single.version);
    await adoptPlanningDraft(single.id, single.version);
    const preserved = await prisma.songRequest.findUniqueOrThrow({
      where: { id: originalRequestId },
    });
    assert.equal(preserved.ideas, request.ideas);
    assert.equal(preserved.status, "ACCEPTED");
  } finally {
    const links = await prisma.musicPlanningDraftPlan.findMany({
      where: { draftId: { in: draftIds } },
    });
    const requests = await prisma.songRequest.findMany({
      where: {
        OR: [{ sourceDraftId: { in: draftIds } }, { id: originalRequestId }],
      },
      select: { id: true },
    });
    await prisma.songRequestPlan.deleteMany({
      where: { requestId: { in: requests.map((r) => r.id) } },
    });
    await prisma.musicPlanningDraftPlan.deleteMany({
      where: { draftId: { in: draftIds } },
    });
    await prisma.songRequest.deleteMany({
      where: { sourceDraftId: { in: draftIds } },
    });
    await prisma.reviewAuditEvent.deleteMany({
      where: {
        OR: [{ entityId: { in: draftIds } }, { sourceId: { in: draftIds } }],
      },
    });
    await prisma.musicPlanningDraft.deleteMany({
      where: { id: { in: draftIds } },
    });
    await prisma.songRequest.deleteMany({ where: { id: originalRequestId } });
    await prisma.adminMusicTodo.deleteMany({
      where: {
        id: { in: [existingPlanId, ...links.map((link) => link.planId)] },
      },
    });
    await prisma.reviewAuditEvent.deleteMany({
      where: { title: { contains: prefix } },
    });
    await prisma.$disconnect();
  }
});

test("public plans isolate private data; support is idempotent, rate limited and ranked by first support time", async () => {
  const prisma = planningPrisma();
  const prefix = `public-planning-test-${randomUUID()}`;
  const ids = [
    "recent",
    "total",
    "production",
    "completed",
    "hidden",
    "cancelled",
  ].map((part) => `${prefix}-${part}`);
  const voters = Array.from({ length: 6 }, () => voterHash(randomUUID()));
  const now = new Date();
  const old = new Date(now.getTime() - 8 * 86400000);
  try {
    for (const [index, id] of ids.entries())
      await prisma.adminMusicTodo.create({
        data: {
          id,
          title: id,
          visible: index !== 4,
          status: [
            "PROPOSED",
            "PLANNING",
            "IN_PRODUCTION",
            "COMPLETED",
            "PROPOSED",
            "CANCELLED",
          ][index],
          notes: "PRIVATE PRODUCTION NOTES",
          publicSummary: "Public direction",
          completedAt: index === 3 ? now : null,
        },
      });
    await prisma.musicPlanVote.createMany({
      data: [
        { planId: ids[0], voterId: voters[0], createdAt: now },
        { planId: ids[0], voterId: voters[1], createdAt: now },
        ...voters
          .slice(0, 3)
          .map((voterId) => ({ planId: ids[1], voterId, createdAt: old })),
      ],
    });
    await assert.rejects(deleteAdminMusicTodo(ids[0]), /support records/);
    const recent = await listPublicPlans({
      tab: "pool",
      sort: "recent",
      q: prefix,
      now,
    });
    assert.deepEqual(
      recent.items.map((item) => item.id),
      [ids[0], ids[1]],
    );
    const total = await listPublicPlans({
      tab: "pool",
      sort: "support",
      q: prefix,
      now,
    });
    assert.deepEqual(
      total.items.map((item) => item.id),
      [ids[1], ids[0]],
    );
    assert.equal(total.items[0].supports, 3);
    assert.equal(total.items[0].recent, 0);
    assert.equal(
      JSON.stringify(total).includes("PRIVATE PRODUCTION NOTES"),
      false,
    );
    assert.equal(await getPublicPlan(ids[4]), null);
    assert.equal(await getPublicPlan(ids[5]), null);
    await assert.rejects(
      setPlanSupport(ids[4], voters[4], true),
      /unavailable/,
    );
    assert.equal(
      (await listPublicPlans({ tab: "production", sort: "recent", q: prefix }))
        .items[0].id,
      ids[2],
    );
    assert.equal(
      (await listPublicPlans({ tab: "completed", sort: "newest", q: prefix }))
        .items[0].id,
      ids[3],
    );
    const completed = await getPublicPlan(ids[3]);
    assert.deepEqual(completed.works, []);
    assert.ok(completed.completedAt);
    const first = await setPlanSupport(ids[0], voters[2], true, undefined, now);
    const repeat = await setPlanSupport(
      ids[0],
      voters[2],
      true,
      undefined,
      now,
    );
    assert.deepEqual(repeat, first);
    const concurrent = await Promise.all([
      setPlanSupport(ids[0], voters[3], true),
      setPlanSupport(ids[0], voters[3], true),
    ]);
    assert.equal(concurrent[0].supports, concurrent[1].supports);
    assert.equal(
      await prisma.musicPlanVote.count({
        where: { planId: ids[0], voterId: voters[3] },
      }),
      1,
    );
    await setPlanSupport(ids[1], voters[0], false, undefined, now);
    const restored = await setPlanSupport(
      ids[1],
      voters[0],
      true,
      undefined,
      now,
    );
    assert.equal(restored.supports, 3);
    assert.equal(restored.recent, 0, "cancel/re-support does not refresh heat");
    const personalized = await getPublicPlan(ids[1], voters[0]);
    assert.equal(personalized.supported, true);
    const versionBefore = (
      await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: ids[1] } })
    ).updatedAt.toISOString();
    await setPlanSupport(ids[1], voters[4], true);
    assert.equal(
      (
        await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: ids[1] } })
      ).updatedAt.toISOString(),
      versionBefore,
      "voting does not invalidate admin edit versions",
    );
    for (let i = 0; i < 20; i++)
      await setPlanSupport(ids[0], voters[5], false, undefined, now);
    await assert.rejects(
      setPlanSupport(ids[0], voters[5], false, undefined, now),
      /rateLimited/,
    );
  } finally {
    await prisma.adminMusicTodo.deleteMany({ where: { id: { in: ids } } });
    await prisma.musicPlanVoteLimit.deleteMany({
      where: { key: { in: voters.map((id) => `voter:${id}`) } },
    });
    await prisma.reviewAuditEvent.deleteMany({
      where: { title: { contains: prefix } },
    });
    await prisma.$disconnect();
  }
});

test("request approval, duplicate prevention, many-to-many Works, publication and legacy compatibility", async () => {
  const prisma = planningPrisma();
  const prefix = `planning-test-${randomUUID()}`;
  const requestIds = [0, 1].map((n) => `${prefix}-request-${n}`);
  const workIds = ["draft", "public", "started", "renamed"].map(
    (part) => `${prefix}-${part}`,
  );
  let planId;
  let secondPlanId;
  let connected = false;
  try {
    const legacy = await prisma.adminMusicTodo.findMany({
      where: { contentId: { not: null } },
      select: { id: true, contentId: true },
    });
    connected = true;
    for (const item of legacy)
      assert.ok(
        await prisma.musicPlanWork.findUnique({
          where: {
            planId_contentId: { planId: item.id, contentId: item.contentId },
          },
        }),
        "legacy Work link preserved",
      );
    const legacyContactCount = await prisma.adminMusicTodo.count({
      where: { from: "Contact page" },
    });
    assert.equal(
      await prisma.songRequest.count({ where: { channel: "LEGACY_CONTACT" } }),
      legacyContactCount,
    );

    for (const id of requestIds)
      await prisma.songRequest.create({
        data: {
          id,
          title: `${prefix} song`,
          artist: "Original artist",
          origin: "Original game",
          ideas: "A quiet piano adaptation",
        },
      });
    const first = await prisma.songRequest.findUniqueOrThrow({
      where: { id: requestIds[0] },
    });
    const input = {
      id: first.id,
      updatedAt: first.updatedAt.toISOString(),
      decision: "ACCEPTED",
      reviewNotes: "Reviewed",
      planId: "",
      draft: planFields.parse({
        title: `${prefix} plan`,
        from: "Original game",
        sourceArtists: "",
        sourceUrl: "",
        notes: "Piano production plan",
      }),
    };
    planId = await reviewSongRequest(input);
    assert.ok(planId);
    await assert.rejects(reviewSongRequest(input), /changed/);
    assert.equal(
      await prisma.adminMusicTodo.count({ where: { title: `${prefix} plan` } }),
      1,
      "retry did not create another plan",
    );
    const plan = await prisma.adminMusicTodo.findUniqueOrThrow({
      where: { id: planId },
    });
    assert.equal(plan.visible, false);
    assert.equal(plan.status, "PLANNING");
    const original = await prisma.songRequest.findUniqueOrThrow({
      where: { id: first.id },
    });
    assert.equal(original.ideas, first.ideas);
    assert.equal(original.origin, first.origin);
    const second = await prisma.songRequest.findUniqueOrThrow({
      where: { id: requestIds[1] },
    });
    await reviewSongRequest({
      ...input,
      id: second.id,
      updatedAt: second.updatedAt.toISOString(),
      planId,
    });
    assert.equal(await prisma.songRequestPlan.count({ where: { planId } }), 2);

    await prisma.musicWork.create({
      data: {
        contentId: workIds[0],
        workType: "R",
        status: { create: { visible: false } },
      },
    });
    await prisma.musicWork.create({
      data: {
        contentId: workIds[1],
        workType: "R",
        status: { create: { visible: true, publishedAt: "2026-10-28" } },
      },
    });
    await linkPlanWork({
      planId,
      contentId: workIds[0],
      match: "FULL",
      notes: null,
    });
    assert.equal(
      (await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: planId } }))
        .status,
      "PLANNING",
      "draft Work cannot complete plan",
    );
    await linkPlanWork({
      planId,
      contentId: workIds[1],
      match: "PARTIAL",
      notes: "Instrumental version",
    });
    assert.equal(
      (await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: planId } }))
        .status,
      "PLANNING",
      "partial public Work cannot complete plan",
    );
    await linkPlanWork({
      planId,
      contentId: workIds[1],
      match: "FULL",
      notes: "Delivered",
    });
    const completed = await prisma.adminMusicTodo.findUniqueOrThrow({
      where: { id: planId },
    });
    assert.equal(completed.status, "COMPLETED");
    assert.ok(completed.completedAt);
    await linkPlanWork({
      planId,
      contentId: workIds[1],
      match: "PARTIAL",
      notes: "Corrected match",
    });
    assert.equal(
      (await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: planId } }))
        .status,
      "PLANNING",
      "downgrading the fulfilled Work reopens the plan even when another draft is linked",
    );
    await linkPlanWork({
      planId,
      contentId: workIds[1],
      match: "FULL",
      notes: "Delivered",
    });
    const finalCompletion = await prisma.adminMusicTodo.findUniqueOrThrow({
      where: { id: planId },
    });
    await syncAdminMusicTodoPublicationStatus(workIds[1], true);
    assert.equal(
      (
        await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: planId } })
      ).completedAt.toISOString(),
      finalCompletion.completedAt.toISOString(),
      "repeat sync preserves completion date",
    );
    const secondPlan = await prisma.adminMusicTodo.create({
      data: { title: `${prefix} second plan` },
    });
    secondPlanId = secondPlan.id;
    await linkPlanWork({
      planId: secondPlanId,
      contentId: workIds[1],
      match: "FULL",
      notes: null,
    });
    assert.equal(
      await prisma.musicPlanWork.count({ where: { contentId: workIds[1] } }),
      2,
      "one Work satisfies several plans",
    );
    await prisma.musicWorkStatus.update({
      where: { contentId: workIds[1] },
      data: { visible: false },
    });
    await syncAdminMusicTodoPublicationStatus(workIds[1], false);
    assert.equal(
      (await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: planId } }))
        .status,
      "COMPLETED",
      "withdrawal keeps completion history",
    );
    await startAdminMusicTodo({
      contentId: workIds[2],
      id: planId,
      workType: "R",
    });
    assert.equal(
      await prisma.musicPlanWork.count({ where: { planId } }),
      3,
      "one plan has multiple versions",
    );
    const started = await prisma.musicWork.findUniqueOrThrow({
      where: { contentId: workIds[2] },
      include: { source: true, status: true },
    });
    assert.equal(started.source.title, "Original game");
    assert.equal(started.status.visible, false);
    await assert.rejects(
      deleteMusicWorkByContentId(workIds[2]),
      /linked to music plans/,
    );
    await upsertMusicWork(
      {
        contentId: workIds[3],
        workType: "R",
        songTitle: `${prefix} renamed Work`,
        fromTitle: "Original game",
        visible: false,
      },
      workIds[2],
    );
    assert.ok(
      await prisma.musicPlanWork.findUnique({
        where: { planId_contentId: { planId, contentId: workIds[3] } },
      }),
      "renaming Work preserves plan associations",
    );
    assert.equal(
      (await prisma.adminMusicTodo.findUniqueOrThrow({ where: { id: planId } }))
        .contentId,
      workIds[3],
      "legacy Work pointer follows rename",
    );
  } catch (error) {
    console.error("Planning test failed", {
      code: error.code,
      message: error.message,
      cause: error.cause?.code,
    });
    throw error;
  } finally {
    if (connected) {
      await prisma.songRequestPlan.deleteMany({
        where: { requestId: { in: requestIds } },
      });
      await prisma.musicPlanWork.deleteMany({
        where: { contentId: { in: workIds } },
      });
      await prisma.songRequest.deleteMany({
        where: { id: { in: requestIds } },
      });
      await prisma.adminMusicTodo.deleteMany({
        where: { id: { in: [planId, secondPlanId].filter(Boolean) } },
      });
      await prisma.musicWork.deleteMany({
        where: { contentId: { in: workIds } },
      });
    }
    await prisma.reviewAuditEvent.deleteMany({
      where: { title: { contains: prefix } },
    });
    await prisma.$disconnect();
  }
});
