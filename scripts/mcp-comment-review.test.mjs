// Real DB integration, with only live YouTube refresh replaced by a test fixture.
// The connected channel is read-only; all comments, Works and reviews are private fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { loadEnvFile } from "node:process";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@sovia/shared")
      return {
        url: `data:text/javascript,${encodeURIComponent('export const SITE_NAME="Sovia"; export const siteUrl=(path)=>new URL(path,"https://sovia.work").href;')}`,
        shortCircuit: true,
      };
    if (
      specifier === "./youtube-comments" &&
      /\/(mcp-review|comment-reviews)\.ts$/.test(context.parentURL || "")
    ) {
      return {
        url: "data:text/javascript,export const refreshAdminYoutubeComment = (id) => globalThis.__mcpCommentRefresh(id);",
        shortCircuit: true,
      };
    }
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
    )
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
    return next(url, context);
  },
});
if (existsSync(`${root}.env`)) loadEnvFile(`${root}.env`);
const { planningPrisma } = await import(
  "../src/features/admin/data/song-requests.ts"
);
const { prepareMcpOperation, commitMcpOperation } = await import(
  "../src/features/admin/data/mcp-operations.ts"
);
const { handleReviewReadTool } = await import(
  "../src/features/admin/data/mcp-review.ts"
);
const db = planningPrisma();
const nextRefresh = new Map();
const fixtureComments = new Set();
let refreshCalls = 0;
let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error("This test must not call an external API or post a reply.");
};
globalThis.__mcpCommentRefresh = async (id) => {
  assert.ok(fixtureComments.has(id), "Only fixture comments may be refreshed");
  refreshCalls++;
  const change = nextRefresh.get(id) || {};
  nextRefresh.delete(id);
  if (change.error) throw new Error(change.error);
  const comment = await db.adminYoutubeComment.update({
    where: { id },
    data: {
      ownerReplyCheckedAt: new Date(),
      ...change,
    },
  });
  const connection = await db.adminYoutubeConnection.findUniqueOrThrow({
    where: { id: "primary" },
    select: { channelId: true },
  });
  return {
    comment,
    ownerChannelId: connection.channelId,
    isOwn: comment.authorChannelId === connection.channelId,
  };
};
after(async () => {
  globalThis.fetch = originalFetch;
  delete globalThis.__mcpCommentRefresh;
  await db.$disconnect();
  assert.equal(
    networkCalls,
    0,
    "No live API request or reply posting is allowed",
  );
});
const confirm = (ticket) => ({
  operationId: ticket.operationId,
  confirmed: true,
  confirmation: ticket.confirmation,
});
async function apply(operation, input, actor) {
  const ticket = await prepareMcpOperation({ operation, input }, actor);
  return commitMcpOperation(confirm(ticket), actor);
}
async function cleanup(prefix) {
  const reviews = await db.commentReview.findMany({
    where: { commentId: { startsWith: prefix } },
    select: { id: true },
  });
  const requests = await db.songRequest.findMany({
    where: { title: { startsWith: prefix } },
    select: { id: true },
  });
  await db.commentReviewRequest.deleteMany({
    where: { reviewId: { in: reviews.map((r) => r.id) } },
  });
  await db.commentReview.deleteMany({
    where: { id: { in: reviews.map((r) => r.id) } },
  });
  await db.songRequest.deleteMany({
    where: { id: { in: requests.map((r) => r.id) } },
  });
  await db.adminYoutubeComment.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await db.musicWork.deleteMany({
    where: { contentId: { startsWith: prefix } },
  });
  await db.reviewAuditEvent.deleteMany({ where: { actor: `${prefix}:owner` } });
  await db.mcpReviewOperation.deleteMany({
    where: { actor: `${prefix}:owner` },
  });
  await db.mcpOAuthConnection.deleteMany({
    where: { id: `${prefix}-connection` },
  });
  for (const id of fixtureComments)
    if (id.startsWith(prefix)) {
      fixtureComments.delete(id);
      nextRefresh.delete(id);
    }
}
async function fixture(run) {
  const prefix = `mcp-comment-${randomUUID()}`;
  try {
    await db.adminYoutubeConnection.findUniqueOrThrow({
      where: { id: "primary" },
      select: { channelId: true },
    });
    const scopes = ["mcp:read", "mcp:draft", "mcp:review", "mcp:sync"];
    const actor = {
      id: `${prefix}-connection`,
      actor: `${prefix}:owner`,
      scopes,
    };
    await db.mcpOAuthConnection.create({
      data: {
        ...actor,
        clientId: "mcp-comment-test",
        clientName: "Comment integration fixture",
        redirectUri: "http://localhost/test-callback",
        resource: "https://sovia.work/api/admin/mcp",
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });
    await db.musicWork.create({
      data: {
        contentId: `${prefix}-work`,
        workType: "R",
        status: { create: { visible: false } },
      },
    });
    await run(prefix, actor);
  } finally {
    await cleanup(prefix);
  }
}
async function makeComment(prefix, suffix = "comment") {
  const now = new Date();
  const comment = await db.adminYoutubeComment.create({
    data: {
      id: `${prefix}-${suffix}`,
      threadId: `${prefix}-${suffix}`,
      contentId: `${prefix}-work`,
      videoId: "fixture-video",
      authorChannelId: `${prefix}-viewer`,
      authorDisplayName: "Fixture viewer",
      text: `Please cover ${prefix} Song on piano.`,
      publishedAt: now,
      updatedAt: now,
      ownerReplyCheckedAt: null,
    },
  });
  fixtureComments.add(comment.id);
  return comment;
}
async function saveInput(prefix, comment) {
  const source = await handleReviewReadTool("review_get", {
    kind: "youtube_comment",
    id: comment.id,
  });
  assert.equal(source.sourceText, comment.text);
  assert.equal(source.cachedReplyStateOnly, true);
  assert.ok(source.sourceUrl.includes(encodeURIComponent(comment.id)));
  return {
    commentId: comment.id,
    sourceVersion: source.sourceVersion,
    sourceHash: source.sourceHash,
    proposals: [
      {
        key: "one",
        title: `${prefix} Song`,
        from: "",
        sourceArtists: "",
        sourceUrl: "",
        requestedChanges: "Piano version",
        notes: "Consider an instrumental arrangement",
        publicSummary: "",
        missingInfo: "Original artist is unknown",
        evidenceQuotes: [comment.text],
        decision: "create",
        target: "",
        allowDuplicate: false,
      },
    ],
    replyText: "Thank you for the suggestion. I will review the song.",
    rationale: "A song suggestion with an arrangement idea.",
    model: "mcp-reviewed-test",
  };
}
async function reviewFor(commentId) {
  return db.commentReview.findFirstOrThrow({ where: { commentId } });
}

test("MCP comments require reviewed saves and preserve source through approval, reply edits and copy", async () =>
  fixture(async (prefix, actor) => {
    const comment = await makeComment(prefix);
    const input = await saveInput(prefix, comment);
    const ticket = await prepareMcpOperation(
      { operation: "comment.save", input },
      actor,
    );
    assert.equal(
      await db.commentReview.count({ where: { commentId: comment.id } }),
      0,
    );
    const beforeRefresh = refreshCalls;
    const saved = await commitMcpOperation(confirm(ticket), actor);
    assert.equal(refreshCalls, beforeRefresh + 1);
    let review = await reviewFor(comment.id);
    assert.equal(review.reviewedAt, null);
    assert.equal(review.replyApprovedAt, null);
    assert.equal(review.sourceText, comment.text);
    assert.equal(review.sourceHash, input.sourceHash);
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      0,
    );
    const edits = await apply(
      "comment.update",
      {
        id: review.id,
        version: review.version,
        proposals: input.proposals.map((p) => ({
          ...p,
          notes: "Reviewed piano direction",
        })),
        replyText: "Thanks! Your suggestion is in my review list.",
      },
      actor,
    );
    review = await reviewFor(comment.id);
    const approved = await apply(
      "comment.approve",
      { id: review.id, version: review.version, approveReply: true },
      actor,
    );
    assert.equal(approved.receipt.result.replySent, false);
    const linked = await db.commentReviewRequest.findFirstOrThrow({
      where: { reviewId: review.id },
      include: { request: true },
    });
    assert.equal(linked.request.status, "PENDING");
    assert.equal(linked.request.channel, "YOUTUBE_COMMENT");
    assert.equal(
      await db.songRequestPlan.count({
        where: { requestId: linked.requestId },
      }),
      0,
    );
    review = await reviewFor(comment.id);
    assert.ok(review.replyApprovedAt);
    const replyEdited = await apply(
      "reply.update",
      {
        id: review.id,
        version: review.version,
        replyText: "Thank you. I have saved your suggestion for review.",
      },
      actor,
    );
    review = await reviewFor(comment.id);
    assert.equal(review.replyApprovedAt, null);
    await assert.rejects(
      prepareMcpOperation(
        {
          operation: "reply.copy",
          input: { id: review.id, version: review.version },
        },
        actor,
      ),
      /Approve.*reply/i,
    );
    const replyApproved = await apply(
      "reply.approve",
      { id: review.id, version: review.version },
      actor,
    );
    assert.equal(replyApproved.receipt.result.replySent, false);
    review = await reviewFor(comment.id);
    const copied = await apply(
      "reply.copy",
      { id: review.id, version: review.version },
      actor,
    );
    assert.equal(copied.receipt.result.replySent, false);
    assert.equal(copied.receipt.result.replyText, review.replyText);
    assert.equal(copied.receipt.result.youtubeUrl, review.sourceUrl);
    assert.ok((await reviewFor(comment.id)).copiedAt);
    const original = await db.adminYoutubeComment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    assert.equal(original.text, comment.text);
    assert.equal(
      original.hasOwnerReply,
      false,
      "Retrieval must not claim a reply was posted",
    );
    assert.equal(
      original.updatedAt.toISOString(),
      comment.updatedAt.toISOString(),
    );
    assert.deepEqual(
      (await reviewFor(comment.id)).proposals[0].evidenceQuotes,
      [comment.text],
    );
    for (const operation of [
      saved,
      edits,
      approved,
      replyEdited,
      replyApproved,
      copied,
    ]) {
      const audit = await db.reviewAuditEvent.findMany({
        where: { operationId: operation.operationId },
      });
      assert.ok(audit.length > 0);
      assert.ok(audit.every((event) => event.actor === actor.actor));
      assert.deepEqual(
        operation.receipt.audit.map((event) => event.id).sort(),
        audit.map((event) => event.id).sort(),
      );
    }
    assert.ok(
      copied.receipt.audit.some((event) => event.action === "REPLY_RETRIEVED"),
    );
  }));

test("an owner reply discovered after preview blocks recommendation approval and leaves the ticket unconsumed", async () =>
  fixture(async (prefix, actor) => {
    const comment = await makeComment(prefix);
    await apply("comment.save", await saveInput(prefix, comment), actor);
    const review = await reviewFor(comment.id);
    const ticket = await prepareMcpOperation(
      {
        operation: "comment.approve",
        input: { id: review.id, version: review.version, approveReply: true },
      },
      actor,
    );
    nextRefresh.set(comment.id, { hasOwnerReply: true });
    await assert.rejects(
      commitMcpOperation(confirm(ticket), actor),
      /changed|replied/i,
    );
    assert.equal((await reviewFor(comment.id)).reviewedAt, null);
    assert.equal((await reviewFor(comment.id)).replyApprovedAt, null);
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      0,
    );
    assert.equal(
      (
        await db.mcpReviewOperation.findUniqueOrThrow({
          where: { id: ticket.operationId },
        })
      ).committedAt,
      null,
    );
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { operationId: ticket.operationId },
      }),
      0,
    );
  }));

test("already-replied comments cannot be copied even when a reply was previously approved", async () =>
  fixture(async (prefix, actor) => {
    const comment = await makeComment(prefix);
    await apply("comment.save", await saveInput(prefix, comment), actor);
    let review = await reviewFor(comment.id);
    await apply(
      "comment.approve",
      { id: review.id, version: review.version, approveReply: true },
      actor,
    );
    review = await reviewFor(comment.id);
    const ticket = await prepareMcpOperation(
      {
        operation: "reply.copy",
        input: { id: review.id, version: review.version },
      },
      actor,
    );
    nextRefresh.set(comment.id, { hasOwnerReply: true });
    await assert.rejects(
      commitMcpOperation(confirm(ticket), actor),
      /changed|replied/i,
    );
    assert.equal((await reviewFor(comment.id)).copiedAt, null);
    assert.equal(
      (
        await db.mcpReviewOperation.findUniqueOrThrow({
          where: { id: ticket.operationId },
        })
      ).committedAt,
      null,
    );
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { operationId: ticket.operationId },
      }),
      0,
    );
  }));

test("unknown live status and source changes fail closed without saving a review draft", async () =>
  fixture(async (prefix, actor) => {
    const comment = await makeComment(prefix);
    const input = await saveInput(prefix, comment);
    const ticket = await prepareMcpOperation(
      { operation: "comment.save", input },
      actor,
    );
    nextRefresh.set(comment.id, {
      error: "Fixture YouTube status unavailable",
    });
    await assert.rejects(
      commitMcpOperation(confirm(ticket), actor),
      /status unavailable/,
    );
    assert.equal(
      await db.commentReview.count({ where: { commentId: comment.id } }),
      0,
    );
    assert.equal(
      (
        await db.mcpReviewOperation.findUniqueOrThrow({
          where: { id: ticket.operationId },
        })
      ).committedAt,
      null,
    );
    nextRefresh.set(comment.id, {
      text: "Edited by its original author",
      updatedAt: new Date(comment.updatedAt.getTime() + 1000),
    });
    await assert.rejects(
      commitMcpOperation(confirm(ticket), actor),
      /changed/i,
    );
    assert.equal(
      await db.commentReview.count({ where: { commentId: comment.id } }),
      0,
    );
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { operationId: ticket.operationId },
      }),
      0,
    );
    await assert.rejects(
      prepareMcpOperation({ operation: "comment.save", input }, actor),
      /changed/i,
    );
  }));
