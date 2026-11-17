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
        url: `data:text/javascript,${encodeURIComponent(`export { listAdminYoutubeComments } from "${new URL("./youtube-comments.ts", context.parentURL).href}"; export const refreshAdminYoutubeComment = (id) => globalThis.__mcpCommentRefresh(id);`)}`,
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

test("triage filters, opt-out, reopening and source links survive reply and recommendation reviews", async () =>
  fixture(async (prefix, actor) => {
    const comment = await makeComment(prefix);
    const read = () =>
      handleReviewReadTool("review_get", {
        kind: "youtube_comment",
        id: comment.id,
      });
    const list = (filters) =>
      handleReviewReadTool("review_list", {
        kind: "youtube_comments",
        q: prefix,
        ...filters,
      });
    const original = await read();
    assert.equal(original.category, "UNCLASSIFIED");
    assert.equal(original.replyStatus, "UNREPLIED");
    assert.equal((await list({ candidate: true })).total, 1);
    const intoCategory = {
      commentId: comment.id,
      sourceHash: original.sourceHash,
      triageVersion: original.triageVersion,
      categoryOverride: "SONG_REQUEST",
      noReply: true,
    };
    const ticket = await prepareMcpOperation(
      { operation: "comment.triage", input: intoCategory },
      actor,
    );
    assert.equal((await read()).replyStatus, "UNREPLIED");
    const decision = await commitMcpOperation(confirm(ticket), actor);
    assert.ok(
      decision.receipt.audit.some(
        (event) => event.action === "YOUTUBE_COMMENT_TRIAGED",
      ),
    );
    assert.equal(
      (
        await list({
          category: "SONG_REQUEST",
          replyStatus: "NO_REPLY",
          unlinked: true,
        })
      ).total,
      1,
    );
    assert.equal((await list({})).total, 0);
    await assert.rejects(
      prepareMcpOperation(
        { operation: "comment.triage", input: intoCategory },
        actor,
      ),
      /changed/i,
    );
    const input = await saveInput(prefix, comment);
    await assert.rejects(
      prepareMcpOperation({ operation: "comment.save", input }, actor),
      /no reply/i,
    );
    const noReplyInput = {
      ...input,
      replyText: "",
      category: "SONG_REQUEST",
      replyAdvice: "SKIP",
      rationale: "A repeated request can be captured without a reply.",
    };
    await apply("comment.save", noReplyInput, actor);
    const review = await reviewFor(comment.id);
    await apply(
      "comment.approve",
      { id: review.id, version: review.version, approveReply: false },
      actor,
    );
    const optedOut = await read();
    assert.equal(optedOut.replyAdvice, "SKIP");
    assert.equal(optedOut.links.recommendations.length, 1);
    assert.equal(optedOut.links.currentReview.id, review.id);
    assert.ok(optedOut.links.inbox.includes(encodeURIComponent(comment.id)));
    assert.equal(
      (await list({ category: "SONG_REQUEST", unlinked: true })).total,
      0,
    );
    const request = await handleReviewReadTool("review_get", {
      kind: "request",
      id: optedOut.links.recommendations[0].id,
    });
    assert.equal(
      request.links.commentSources[0].originalUrl,
      original.sourceUrl,
    );
    await apply(
      "comment.triage",
      {
        ...intoCategory,
        triageVersion: optedOut.triageVersion,
        categoryOverride: null,
        noReply: false,
      },
      actor,
    );
    assert.equal((await read()).replyStatus, "UNREPLIED");
    const approved = await reviewFor(comment.id);
    await apply(
      "reply.update",
      {
        id: review.id,
        version: approved.version,
        replyText: "Thanks for sharing!",
      },
      actor,
    );
    assert.equal((await list({ replyStatus: "DRAFTED" })).total, 1);
    await db.adminYoutubeComment.update({
      where: { id: comment.id },
      data: { hasOwnerReply: true, ownerReplyCheckedAt: new Date() },
    });
    assert.equal((await list({ replyStatus: "DRAFTED" })).total, 0);
    assert.equal((await list({ replyStatus: "REPLIED" })).total, 1);
    assert.equal((await list({ replyStatus: "REPLIED", offset: 5 })).total, 1);
  }));

test("link a raw comment to an existing request only after reviewing the current target and original source", async () =>
  fixture(async (prefix, actor) => {
    const schema = await handleReviewReadTool("review_operation_schema", {
      operation: "comment.link_request",
    });
    assert.deepEqual(schema.inputSchema.required.toSorted(), [
      "commentId",
      "requestId",
      "sourceHash",
      "triageVersion",
    ]);
    const comment = await makeComment(prefix);
    const request = await db.songRequest.create({
      data: { title: `${prefix} Existing`, channel: "WEBSITE" },
    });
    const read = () =>
      handleReviewReadTool("review_get", {
        kind: "youtube_comment",
        id: comment.id,
      });
    const source = await read();
    const input = {
      commentId: comment.id,
      requestId: request.id,
      sourceHash: source.sourceHash,
      triageVersion: source.triageVersion,
    };
    const prepared = await prepareMcpOperation(
      { operation: "comment.link_request", input },
      actor,
    );
    assert.equal(prepared.preview.before.request.title, request.title);
    assert.equal((await read()).links.recommendations.length, 0);
    await db.songRequest.update({
      where: { id: request.id },
      data: { status: "ARCHIVED" },
    });
    await assert.rejects(
      commitMcpOperation(confirm(prepared), actor),
      /active|changed/i,
    );
    assert.equal((await read()).links.recommendations.length, 0);
    await db.songRequest.update({
      where: { id: request.id },
      data: { status: "PENDING" },
    });
    const result = await apply("comment.link_request", input, actor);
    assert.ok(result.receipt.audit.length > 0);
    const linked = await read();
    assert.equal(linked.category, "SONG_REQUEST");
    assert.equal(linked.replyStatus, "UNREPLIED");
    assert.deepEqual(
      linked.links.recommendations.map((item) => item.id),
      [request.id],
    );
    const linkedRequest = await handleReviewReadTool("review_get", {
      kind: "request",
      id: request.id,
    });
    assert.equal(
      linkedRequest.links.commentSources[0].originalUrl,
      source.sourceUrl,
    );
    assert.equal(
      linkedRequest.commentSources[0].review.sourceText,
      comment.text,
    );
    await apply(
      "comment.link_request",
      { ...input, triageVersion: linked.triageVersion },
      actor,
    );
    assert.equal(
      await db.commentReviewRequest.count({ where: { requestId: request.id } }),
      1,
    );
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      1,
    );
    const draft = {
      ...(await saveInput(prefix, comment)),
      proposals: [],
      replyAdvice: "REPLY",
    };
    await apply("comment.save", draft, actor);
    const afterDraft = await read();
    assert.equal(afterDraft.replyStatus, "DRAFTED");
    assert.equal(
      afterDraft.links.currentReview.id,
      linked.links.currentReview.id,
    );
    assert.deepEqual(
      afterDraft.links.recommendations.map((item) => item.id),
      [request.id],
    );
    const edited = await reviewFor(comment.id);
    await apply(
      "comment.approve",
      { id: edited.id, version: edited.version, approveReply: false },
      actor,
    );
    const approved = await reviewFor(comment.id);
    assert.equal(approved.replyApprovedAt, null);
    await apply(
      "reply.approve",
      { id: approved.id, version: approved.version },
      actor,
    );
    assert.ok((await reviewFor(comment.id)).replyApprovedAt);
    assert.equal((await read()).replyStatus, "DRAFTED");
  }));

test("manual source snapshots can be classified after opt-out or an owner reply without reopening the reply", async () =>
  fixture(async (prefix, actor) => {
    const request = await db.songRequest.create({
      data: { title: `${prefix} Existing` },
    });
    for (const state of ["NO_REPLY", "REPLIED"]) {
      const comment = await makeComment(prefix, state);
      await db.adminYoutubeComment.update({
        where: { id: comment.id },
        data:
          state === "REPLIED"
            ? { hasOwnerReply: true, ownerReplyCheckedAt: new Date() }
            : { noReplyAt: new Date() },
      });
      const read = () =>
        handleReviewReadTool("review_get", {
          kind: "youtube_comment",
          id: comment.id,
        });
      const source = await read();
      await apply(
        "comment.link_request",
        {
          commentId: comment.id,
          requestId: request.id,
          sourceHash: source.sourceHash,
          triageVersion: source.triageVersion,
        },
        actor,
      );
      const linked = await read();
      const withReply = await saveInput(prefix, comment);
      await assert.rejects(
        prepareMcpOperation(
          { operation: "comment.save", input: withReply },
          actor,
        ),
        /no reply|already replied/i,
      );
      await apply(
        "comment.save",
        {
          ...withReply,
          replyText: "",
          proposals: [],
          replyAdvice: "SKIP",
          category: "SONG_REQUEST",
        },
        actor,
      );
      const draft = await reviewFor(comment.id);
      await apply(
        "comment.approve",
        { id: draft.id, version: draft.version, approveReply: false },
        actor,
      );
      const reviewed = await reviewFor(comment.id);
      await assert.rejects(
        prepareMcpOperation(
          {
            operation: "reply.approve",
            input: { id: reviewed.id, version: reviewed.version },
          },
          actor,
        ),
        /no reply|already replied/i,
      );
      assert.equal(reviewed.id, linked.links.currentReview.id);
      assert.equal(reviewed.replyAdvice, "SKIP");
      assert.equal(reviewed.replyText, "");
      const final = await read();
      assert.equal(final.replyStatus, state);
      assert.deepEqual(
        final.links.recommendations.map((item) => item.id),
        [request.id],
      );
    }
  }));

test("an already answered comment can still become a linked song request without a second reply", async () =>
  fixture(async (prefix, actor) => {
    const comment = await makeComment(prefix);
    await db.adminYoutubeComment.update({
      where: { id: comment.id },
      data: { hasOwnerReply: true, ownerReplyCheckedAt: new Date() },
    });
    const input = {
      ...(await saveInput(prefix, comment)),
      replyText: "",
      category: "SONG_REQUEST",
      replyAdvice: "SKIP",
    };
    await apply("comment.save", input, actor);
    const review = await reviewFor(comment.id);
    await apply(
      "comment.approve",
      { id: review.id, version: review.version, approveReply: false },
      actor,
    );
    const source = await handleReviewReadTool("review_get", {
      kind: "youtube_comment",
      id: comment.id,
    });
    assert.equal(source.replyStatus, "REPLIED");
    assert.equal(source.links.recommendations.length, 1);
    assert.equal((await reviewFor(comment.id)).replyApprovedAt, null);
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
