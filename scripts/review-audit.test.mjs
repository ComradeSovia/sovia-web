// Run: node --test scripts/review-audit.test.mjs
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
const { undoReviewMerge } = await import(
  "../src/features/admin/data/review-audit.ts"
);
const { adoptPlanningDraft } = await import(
  "../src/features/admin/data/planning-drafts.ts"
);
const { approveCommentReview, updateReviewedReply, getApprovedReplyForCopy } =
  await import("../src/features/admin/data/comment-reviews.ts");
const { commentHash } = await import(
  "../src/features/admin/data/comment-source.ts"
);
const { updateAdminMusicTodo, syncAdminMusicTodoPublicationStatus } =
  await import("../src/features/admin/data/music-todos.ts");
const actor = "audit-test-admin";
function proposal(prefix, target) {
  return {
    key: "one",
    title: `${prefix} song`,
    from: "Test album",
    sourceArtists: "Test artist",
    sourceUrl: "",
    requestedChanges: "Piano version",
    notes: "Keep this source direction",
    publicSummary: "Public direction",
    missingInfo: "",
    evidenceQuotes: ["Please make a piano version."],
    decision: "merge",
    target,
    allowDuplicate: false,
  };
}
async function cleanup(db, prefix) {
  const drafts = await db.musicPlanningDraft.findMany({
    where: { sourceName: { contains: prefix } },
    select: { id: true },
  });
  const requests = await db.songRequest.findMany({
    where: { title: { contains: prefix } },
    select: { id: true },
  });
  const plans = await db.adminMusicTodo.findMany({
    where: { title: { contains: prefix } },
    select: { id: true },
  });
  const reviews = await db.commentReview.findMany({
    where: { commentId: { startsWith: prefix } },
    select: { id: true },
  });
  await db.commentReviewRequest.deleteMany({
    where: { reviewId: { in: reviews.map((r) => r.id) } },
  });
  await db.commentReview.deleteMany({
    where: { id: { in: reviews.map((r) => r.id) } },
  });
  await db.adminYoutubeComment.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await db.musicPlanningDraftPlan.deleteMany({
    where: { draftId: { in: drafts.map((d) => d.id) } },
  });
  await db.songRequestPlan.deleteMany({
    where: { requestId: { in: requests.map((r) => r.id) } },
  });
  // A fixture can be both imported from one draft and the source of another.
  // Break only that test-owned cycle before removing its immutable records.
  await db.musicPlanningDraft.updateMany({
    where: { id: { in: drafts.map((d) => d.id) } },
    data: { originalRequestId: null },
  });
  await db.songRequest.deleteMany({
    where: { id: { in: requests.map((r) => r.id) } },
  });
  await db.musicPlanningDraft.deleteMany({
    where: { id: { in: drafts.map((d) => d.id) } },
  });
  await db.musicPlanWork.deleteMany({
    where: { planId: { in: plans.map((p) => p.id) } },
  });
  await db.adminMusicTodo.deleteMany({
    where: { id: { in: plans.map((p) => p.id) } },
  });
  await db.musicWork.deleteMany({
    where: { contentId: { startsWith: prefix } },
  });
  await db.reviewAuditEvent.deleteMany({
    where: {
      OR: [
        { title: { contains: prefix } },
        { entityId: { in: reviews.map((r) => r.id) } },
      ],
    },
  });
  await db.$disconnect();
}

test("audit records are transactional; request merge undo is idempotent and preserves later plan edits and original text", async () => {
  const db = planningPrisma(),
    prefix = `audit-request-${randomUUID()}`;
  try {
    const plan = await db.adminMusicTodo.create({
      data: {
        id: `${prefix}-plan`,
        title: `${prefix} plan`,
        status: "COMPLETED",
        completedAt: new Date(),
        visible: false,
        notes: "Original plan direction",
      },
    });
    const request = await db.songRequest.create({
      data: {
        id: `${prefix}-request`,
        title: `${prefix} song`,
        ideas: "Immutable original request",
      },
    });
    const input = {
      id: request.id,
      updatedAt: request.updatedAt.toISOString(),
      decision: "ACCEPTED",
      reviewNotes: "Accepted",
      planId: plan.id,
      draft: planFields.parse({
        title: prefix,
        from: "",
        sourceArtists: "",
        sourceUrl: "",
        notes: "",
      }),
    };
    await reviewSongRequest(input, actor);
    const event = await db.reviewAuditEvent.findFirstOrThrow({
      where: { entityId: request.id, action: "REQUEST_MERGED" },
    });
    assert.equal(event.actor, actor);
    assert.ok(event.before);
    const originalAudit = JSON.stringify(event);
    const count = await db.reviewAuditEvent.count({
      where: { entityId: request.id },
    });
    await assert.rejects(reviewSongRequest(input, actor), /changed/);
    assert.equal(
      await db.reviewAuditEvent.count({ where: { entityId: request.id } }),
      count,
    );
    await db.adminMusicTodo.update({
      where: { id: plan.id },
      data: { notes: "Later plan edit", visible: true },
    });
    await db.songRequest.update({
      where: { id: request.id },
      data: { reviewNotes: "Later reviewer note" },
    });
    const undone = await Promise.all([
      undoReviewMerge(event.id, "Wrong target", actor),
      undoReviewMerge(event.id, "Retry", actor),
    ]);
    assert.equal(undone[0].id, undone[1].id);
    const current = await db.songRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: { plans: true },
    });
    assert.equal(current.status, "PENDING");
    assert.equal(current.ideas, "Immutable original request");
    assert.equal(current.reviewNotes, "Later reviewer note");
    assert.equal(current.plans.length, 0);
    const preserved = await db.adminMusicTodo.findUniqueOrThrow({
      where: { id: plan.id },
    });
    assert.equal(preserved.notes, "Later plan edit");
    assert.equal(preserved.status, "COMPLETED");
    assert.equal(preserved.visible, true);
    assert.equal(
      JSON.stringify(
        await db.reviewAuditEvent.findUniqueOrThrow({
          where: { id: event.id },
        }),
      ),
      originalAudit,
    );
    assert.equal(
      await db.reviewAuditEvent.count({ where: { undoOfId: event.id } }),
      1,
    );
    await reviewSongRequest(
      { ...input, updatedAt: current.updatedAt.toISOString() },
      actor,
    );
    await undoReviewMerge(event.id, "Retry after re-link", actor);
    assert.equal(
      await db.songRequestPlan.count({ where: { requestId: request.id } }),
      1,
      "retrying an old undo cannot remove a new association",
    );
  } finally {
    await cleanup(db, prefix);
  }
});

test("AI merge undo removes only the adopted association and keeps conversation evidence and applied draft immutable", async () => {
  const db = planningPrisma(),
    prefix = `audit-draft-${randomUUID()}`;
  try {
    const plan = await db.adminMusicTodo.create({
      data: {
        id: `${prefix}-plan`,
        title: `${prefix} plan`,
        status: "PLANNING",
      },
    });
    const p = proposal(prefix, plan.id);
    const draft = await db.musicPlanningDraft.create({
      data: {
        id: `${prefix}-draft`,
        sourceHash: prefix,
        sourceName: prefix,
        sourceText: "Please make a piano version.",
        proposals: [p],
      },
    });
    await adoptPlanningDraft(draft.id, 1, actor);
    const request = await db.songRequest.findFirstOrThrow({
      where: { sourceDraftId: draft.id },
    });
    const event = await db.reviewAuditEvent.findFirstOrThrow({
      where: { entityId: request.id, action: "REQUEST_MERGED" },
    });
    await undoReviewMerge(event.id, "Wrong plan selected", actor);
    assert.equal(
      await db.songRequestPlan.count({ where: { requestId: request.id } }),
      0,
    );
    assert.equal(
      await db.musicPlanningDraftPlan.count({ where: { draftId: draft.id } }),
      0,
    );
    const source = await db.songRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    assert.equal(source.sourceDraftId, draft.id);
    assert.equal(source.sourceProposalKey, p.key);
    assert.equal(source.status, "PENDING");
    const snapshot = await db.musicPlanningDraft.findUniqueOrThrow({
      where: { id: draft.id },
    });
    assert.equal(snapshot.sourceText, draft.sourceText);
    assert.equal(snapshot.status, "APPLIED");
    assert.deepEqual(snapshot.proposals, draft.proposals);
    assert.deepEqual(
      await adoptPlanningDraft(draft.id, snapshot.version, actor),
      [],
      "retries do not re-apply an undone source",
    );
  } finally {
    await cleanup(db, prefix);
  }
});

test("undo protects a later single-request adoption of an imported chat source and preserves preexisting links", async () => {
  const db = planningPrisma(),
    prefix = `audit-shared-source-${randomUUID()}`;
  try {
    const plan = await db.adminMusicTodo.create({
      data: {
        id: `${prefix}-plan`,
        title: `${prefix} plan`,
        status: "PLANNING",
      },
    });
    const p = proposal(prefix, plan.id);
    const chat = await db.musicPlanningDraft.create({
      data: {
        sourceHash: `${prefix}-chat`,
        sourceName: `${prefix} chat`,
        sourceText: "Please make a piano version.",
        proposals: [p],
      },
    });
    await adoptPlanningDraft(chat.id, 1, actor);
    const request = await db.songRequest.findFirstOrThrow({
      where: { sourceDraftId: chat.id },
    });
    const original = await db.reviewAuditEvent.findFirstOrThrow({
      where: {
        entityId: request.id,
        sourceId: chat.id,
        action: "REQUEST_MERGED",
      },
    });
    const single = await db.musicPlanningDraft.create({
      data: {
        sourceHash: `${prefix}-single`,
        sourceName: `${prefix} single`,
        originalRequestId: request.id,
        requestVersion: request.updatedAt,
        sourceText: "Please make a piano version.",
        proposals: [p],
      },
    });
    await adoptPlanningDraft(single.id, 1, actor);
    const later = await db.reviewAuditEvent.findFirstOrThrow({
      where: {
        entityId: request.id,
        sourceId: single.id,
        action: "REQUEST_MERGED",
      },
    });
    const before = await db.songRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    await assert.rejects(
      undoReviewMerge(original.id, "Wrong target", actor),
      /Another adopted source/,
    );
    assert.equal(
      await db.reviewAuditEvent.count({ where: { undoOfId: original.id } }),
      0,
    );
    assert.equal(
      await db.songRequestPlan.count({ where: { requestId: request.id } }),
      1,
    );
    assert.equal(
      await db.musicPlanningDraftPlan.count({ where: { planId: plan.id } }),
      2,
    );
    assert.equal(
      (
        await db.songRequest.findUniqueOrThrow({ where: { id: request.id } })
      ).updatedAt.getTime(),
      before.updatedAt.getTime(),
    );

    await undoReviewMerge(later.id, "Undo only the later adoption", actor);
    assert.equal(
      await db.songRequestPlan.count({ where: { requestId: request.id } }),
      1,
    );
    assert.equal(
      (await db.songRequest.findUniqueOrThrow({ where: { id: request.id } }))
        .status,
      "ACCEPTED",
    );
    assert.equal(
      await db.musicPlanningDraftPlan.count({ where: { draftId: single.id } }),
      0,
    );
    assert.equal(
      await db.musicPlanningDraftPlan.count({ where: { draftId: chat.id } }),
      1,
    );
    await undoReviewMerge(
      original.id,
      "Original source can now be detached safely",
      actor,
    );
    assert.equal(
      await db.songRequestPlan.count({ where: { requestId: request.id } }),
      0,
    );
    const preserved = await db.songRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    assert.equal(preserved.status, "PENDING");
    assert.equal(preserved.sourceDraftId, chat.id);
    assert.equal(preserved.sourceProposalKey, p.key);
    assert.equal(
      await db.musicPlanningDraft.count({
        where: { id: { in: [chat.id, single.id] }, status: "APPLIED" },
      }),
      2,
    );
  } finally {
    await cleanup(db, prefix);
  }
});

test("comment merge undo creates a separate pending recommendation, preserves all sources and revokes stale reply approval", async () => {
  const db = planningPrisma(),
    prefix = `audit-comment-${randomUUID()}`;
  try {
    const work = await db.musicWork.create({
      data: { contentId: `${prefix}-work`, workType: "R" },
    });
    const target = await db.songRequest.create({
      data: {
        id: `${prefix}-target`,
        title: `${prefix} song`,
        artist: "Test artist",
        ideas: "Keep original target text",
      },
    });
    const reviewIds = [];
    const live = new Map();
    for (let i = 0; i < 2; i++) {
      const comment = await db.adminYoutubeComment.create({
        data: {
          id: `${prefix}-comment${i}`,
          threadId: `${prefix}-thread${i}`,
          contentId: work.contentId,
          videoId: "test",
          authorChannelId: "audience",
          authorDisplayName: "UI test",
          text: "Please make a piano version.",
          publishedAt: new Date(),
          updatedAt: new Date(),
          ownerReplyCheckedAt: new Date(),
        },
      });
      const p = { ...proposal(prefix, target.id), decision: "attach" };
      const review = await db.commentReview.create({
        data: {
          commentId: comment.id,
          sourceHash: commentHash(comment),
          sourceText: comment.text,
          sourceUrl: "https://www.youtube.com/watch?v=test",
          sourceVersion: comment.updatedAt,
          ownerChannelId: "owner",
          proposals: [p],
          replyText: "Draft reply",
          rationale: "test",
          model: "test",
          promptKey: "test",
        },
      });
      reviewIds.push(review.id);
      live.set(comment.id, { comment, ownerChannelId: "owner", isOwn: false });
      await approveCommentReview(
        review.id,
        1,
        true,
        async (id) => live.get(id),
        actor,
      );
    }
    const event = await db.reviewAuditEvent.findFirstOrThrow({
      where: { entityId: reviewIds[0], action: "COMMENT_MERGED" },
    });
    const before = await db.commentReview.findUniqueOrThrow({
      where: { id: reviewIds[0] },
    });
    await updateReviewedReply(
      before.id,
      before.version,
      "Later reply wording",
      actor,
    );
    await db.commentReview.update({
      where: { id: before.id },
      data: { copiedAt: new Date() },
    });
    await undoReviewMerge(event.id, "This was a different adaptation", actor);
    const edge = await db.commentReviewRequest.findUniqueOrThrow({
      where: {
        reviewId_proposalKey: { reviewId: before.id, proposalKey: "one" },
      },
    });
    assert.notEqual(edge.requestId, target.id);
    const separate = await db.songRequest.findUniqueOrThrow({
      where: { id: edge.requestId },
    });
    assert.equal(separate.status, "PENDING");
    assert.equal(separate.ideas, "Piano version");
    const after = await db.commentReview.findUniqueOrThrow({
      where: { id: before.id },
    });
    assert.equal(after.sourceText, before.sourceText);
    assert.deepEqual(after.proposals, before.proposals);
    assert.equal(after.replyText, "Later reply wording");
    assert.equal(after.replyApprovedAt, null);
    assert.ok(after.copiedAt);
    assert.equal(
      (await db.songRequest.findUniqueOrThrow({ where: { id: target.id } }))
        .ideas,
      "Keep original target text",
    );
    assert.equal(
      await db.commentReviewRequest.count({ where: { requestId: target.id } }),
      1,
      "other comment sources remain linked",
    );
    await assert.rejects(
      getApprovedReplyForCopy(after.id, async (id) => live.get(id)),
      /approve/,
    );
  } finally {
    await cleanup(db, prefix);
  }
});

test("publication and Work status changes have before/after audit entries", async () => {
  const db = planningPrisma(),
    prefix = `audit-work-${randomUUID()}`;
  try {
    const plan = await db.adminMusicTodo.create({
      data: {
        id: `${prefix}-plan`,
        title: `${prefix} plan`,
        status: "PLANNING",
      },
    });
    await updateAdminMusicTodo(
      plan.id,
      { title: plan.title, status: "PLANNING", visible: true },
      actor,
    );
    const published = await db.reviewAuditEvent.findFirstOrThrow({
      where: { entityId: plan.id, action: "PLAN_PUBLISHED" },
    });
    assert.equal(published.before.visible, false);
    assert.equal(published.after.visible, true);
    const work = await db.musicWork.create({
      data: {
        contentId: `${prefix}-work`,
        workType: "R",
        status: { create: { visible: false } },
      },
    });
    await linkPlanWork(
      {
        planId: plan.id,
        contentId: work.contentId,
        match: "FULL",
        notes: "Draft version",
      },
      actor,
    );
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { entityId: plan.id, action: "WORK_LINKED" },
      }),
      1,
    );
    await db.musicWorkStatus.update({
      where: { contentId: work.contentId },
      data: { visible: true, publishedAt: "2026-10-29" },
    });
    await syncAdminMusicTodoPublicationStatus(work.contentId, true);
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: plan.id } }))
        .status,
      "COMPLETED",
    );
    const completed = await db.reviewAuditEvent.findFirstOrThrow({
      where: { entityId: plan.id, action: "PLAN_COMPLETION_CHANGED" },
    });
    assert.equal(completed.before.status, "PLANNING");
    assert.equal(completed.after.status, "COMPLETED");
    await assert.rejects(
      undoReviewMerge(published.id, "Not a merge", actor),
      /Only recorded merge/,
    );
  } finally {
    await cleanup(db, prefix);
  }
});
