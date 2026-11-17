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
const { planningPrisma } = await import(
  "../src/features/admin/data/song-requests.ts"
);
const { commentHash } = await import(
  "../src/features/admin/data/comment-source.ts"
);
const { youtubeCommentUrl } = await import(
  "../src/features/admin/model/comment-review.ts"
);
const {
  parseCommentOutput,
  saveCommentBatch,
  updateCommentReview,
  approveCommentReview,
  getApprovedReplyForCopy,
  dismissCommentReview,
  listUnprocessedCommentIds,
  updateReviewedReply,
  approveSavedReply,
  linkCommentRequest,
  updateCommentTriage,
} = await import("../src/features/admin/data/comment-reviews.ts");
const { undoReviewMerge } = await import(
  "../src/features/admin/data/review-audit.ts"
);
const { isOwnerAuthor } = await import(
  "../src/features/admin/data/youtube-comments.ts"
);

test("comment reviews preserve source, deduplicate, require human approval and block replied/unknown/changed sources", async () => {
  const db = planningPrisma();
  const prefix = `comment-test-${randomUUID()}`;
  const commentIds = [];
  const reviewIds = [];
  try {
    const work = await db.musicWork.findFirst({ select: { contentId: true } });
    const connection = await db.adminYoutubeConnection.findUniqueOrThrow({
      where: { id: "primary" },
    });
    assert.ok(work, "one existing Work is needed for the FK fixture");
    assert.equal(
      isOwnerAuthor(
        {
          snippet: {
            authorChannelId: { value: "impostor" },
            authorDisplayName: "@ComradeSovia",
          },
        },
        connection.channelId,
      ),
      false,
      "names cannot impersonate channel ownership",
    );
    assert.equal(
      isOwnerAuthor(
        {
          snippet: {
            authorChannelId: { value: connection.channelId },
            authorDisplayName: "anything",
          },
        },
        connection.channelId,
      ),
      true,
    );
    const make = async (suffix, proposals = true) => {
      const now = new Date();
      const comment = await db.adminYoutubeComment.create({
        data: {
          id: `${prefix}-${suffix}`,
          threadId: `${prefix}-${suffix}`,
          contentId: work.contentId,
          videoId: "qa-test-video",
          authorChannelId: "qa-viewer",
          authorDisplayName: "QA Viewer",
          text: `Please cover ${prefix} Song by QA Artist on piano.`,
          publishedAt: now,
          updatedAt: now,
          ownerReplyCheckedAt: now,
        },
      });
      commentIds.push(comment.id);
      const meta = {
        commentId: comment.id,
        sourceHash: commentHash(comment),
        sourceText: comment.text,
        sourceUrl: youtubeCommentUrl(comment),
        sourceVersion: comment.updatedAt.toISOString(),
        ownerChannelId: connection.channelId,
        ownerReplyCheckedAt: now.toISOString(),
        model: "test-model",
        promptKey: "test-prompt",
      };
      const generated = {
        proposals: proposals
          ? [
              {
                title: `${prefix} Song`,
                from: "",
                sourceArtists: "QA Artist",
                sourceUrl: "",
                requestedChanges: "Piano cover",
                notes: "Sketch piano and review balance.",
                publicSummary: "Piano cover",
                missingInfo: "Origin unknown",
                evidenceQuotes: [comment.text],
              },
            ]
          : [],
        replyText: "Thanks for the suggestion!",
        rationale: "Concrete song request",
      };
      return {
        comment,
        meta,
        generated,
        preview: parseCommentOutput(JSON.stringify(generated), meta),
      };
    };
    const a = await make("a");
    assert.equal(
      a.preview.category,
      "SONG_REQUEST",
      "older generated output still identifies concrete songs",
    );
    assert.throws(
      () =>
        parseCommentOutput(
          JSON.stringify({
            ...a.generated,
            proposals: [
              { ...a.generated.proposals[0], evidenceQuotes: ["invented"] },
            ],
          }),
          a.meta,
        ),
      /verified/,
    );
    assert.throws(
      () =>
        parseCommentOutput(
          JSON.stringify({
            ...a.generated,
            replyText: "Listen at https://invented.test/",
          }),
          a.meta,
        ),
      /unverified/,
    );
    const save = async (preview) => {
      const saved = await saveCommentBatch({ items: [preview], skipped: [] });
      reviewIds.push(...saved.reviewIds);
      return saved.reviewIds[0];
    };
    const aId = await save(a.preview);
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      0,
      "preview save creates no recommendations",
    );
    const edited = a.preview.proposals.map((p) => ({
      ...p,
      notes: "Human edit preserved",
    }));
    await updateCommentReview(aId, 1, edited, "Human-approved wording");
    assert.equal(await save(a.preview), aId, "same source has one review");
    let review = await db.commentReview.findUniqueOrThrow({
      where: { id: aId },
    });
    assert.equal(review.replyText, "Human-approved wording");
    assert.equal(review.version, 2);
    await assert.rejects(
      updateCommentReview(aId, 1, edited, "stale overwrite"),
      /changed/,
    );
    const live = async (id) => ({
      comment: await db.adminYoutubeComment.findUniqueOrThrow({
        where: { id },
      }),
      ownerChannelId: connection.channelId,
      isOwn: false,
    });
    await assert.rejects(getApprovedReplyForCopy(aId, live), /approve/);
    const answered = async (id) => {
      const value = await live(id);
      return { ...value, comment: { ...value.comment, hasOwnerReply: true } };
    };
    await assert.rejects(
      approveCommentReview(aId, 2, true, answered),
      /Already replied/,
    );
    await assert.rejects(
      approveCommentReview(aId, 2, true, async () => {
        throw new Error("YouTube unavailable");
      }),
      /unavailable/,
    );
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      0,
      "failed status checks create nothing",
    );
    await Promise.all([
      approveCommentReview(aId, 2, true, live),
      approveCommentReview(aId, 2, true, live),
    ]);
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      1,
      "concurrent approval is idempotent",
    );
    assert.equal(
      (await getApprovedReplyForCopy(aId, live)).replyText,
      "Human-approved wording",
    );
    await assert.rejects(
      getApprovedReplyForCopy(aId, answered),
      /already replied/,
    );
    await assert.rejects(
      getApprovedReplyForCopy(aId, async (id) => {
        const current = await db.commentReview.findUniqueOrThrow({
          where: { id: aId },
        });
        await updateReviewedReply(
          aId,
          current.version,
          "Changed during copy check",
        );
        return live(id);
      }),
      /approval or source changed/,
      "a concurrent edit cannot copy a revoked reply",
    );
    review = await db.commentReview.findUniqueOrThrow({ where: { id: aId } });
    await assert.rejects(
      updateCommentReview(aId, review.version, edited, "overwrite reviewed"),
      /read-only/,
    );
    const b = await make("b");
    assert.deepEqual(
      (await listUnprocessedCommentIds(connection.channelId, 5, prefix)).map(
        (c) => c.id,
      ),
      [b.comment.id],
      "batch queue advances past saved/reviewed source versions",
    );
    const bId = await save(b.preview);
    await db.adminYoutubeComment.update({
      where: { id: b.comment.id },
      data: {
        authorChannelId: `${prefix}-updated-viewer`,
        authorDisplayName: `${prefix}-name-only`,
      },
    });
    assert.deepEqual(
      (await listUnprocessedCommentIds(connection.channelId, 5, prefix)).map(
        (row) => row.id,
      ),
      [b.comment.id],
      "an updated source identity reopens an otherwise identical cached comment",
    );
    assert.deepEqual(
      await listUnprocessedCommentIds(
        connection.channelId,
        5,
        `${prefix}-name-only`,
      ),
      [],
      "the AI batch search is restricted to comment text",
    );
    await db.adminYoutubeComment.update({
      where: { id: b.comment.id },
      data: {
        authorChannelId: b.comment.authorChannelId,
        authorDisplayName: b.comment.authorDisplayName,
      },
    });
    await assert.rejects(
      approveCommentReview(bId, 1, false, live),
      /matching recommendation/,
    );
    assert.equal(
      (await db.commentReview.findUniqueOrThrow({ where: { id: bId } }))
        .reviewedAt,
      null,
      "duplicate failure rolls back review status",
    );
    const request = await db.songRequest.findFirstOrThrow({
      where: { title: { startsWith: prefix } },
    });
    await updateCommentReview(
      bId,
      1,
      b.preview.proposals.map((p) => ({
        ...p,
        decision: "attach",
        target: request.id,
      })),
      b.preview.replyText,
    );
    await approveCommentReview(bId, 2, false, live);
    await updateReviewedReply(bId, 3, "Separate reply review");
    await assert.rejects(getApprovedReplyForCopy(bId, live), /approve/);
    await assert.rejects(approveSavedReply(bId, 4, answered), /blocked/);
    await approveSavedReply(bId, 4, live);
    assert.equal(
      (await getApprovedReplyForCopy(bId, live)).replyText,
      "Separate reply review",
    );
    await updateReviewedReply(bId, 5, "Edited after approval");
    await assert.rejects(
      getApprovedReplyForCopy(bId, live),
      /approve/,
      "editing invalidates prior approval",
    );
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      1,
      "merge reuses original recommendation",
    );
    assert.equal(
      await db.commentReviewRequest.count({ where: { requestId: request.id } }),
      2,
      "both source comments are preserved",
    );
    assert.equal(
      (await db.songRequest.findUniqueOrThrow({ where: { id: request.id } }))
        .status,
      "PENDING",
      "comment approval does not accept/create a plan",
    );
    const c = await make("c");
    const cId = await save(c.preview);
    await db.adminYoutubeComment.update({
      where: { id: c.comment.id },
      data: {
        text: "Edited by viewer",
        updatedAt: new Date(c.comment.updatedAt.getTime() + 1000),
      },
    });
    await assert.rejects(approveCommentReview(cId, 1, true, live), /edited/);
    await dismissCommentReview(cId, 1);
    const d = await make("d", false);
    const dId = await save(d.preview);
    await approveCommentReview(dId, 1, false, live);
    assert.equal(
      await db.commentReviewRequest.count({ where: { reviewId: dId } }),
      0,
      "non-song comments can be reviewed without manufacturing recommendations",
    );

    const suppress = {
      commentId: d.comment.id,
      sourceHash: d.meta.sourceHash,
      triageVersion: 0,
      noReply: true,
      categoryOverride: "FEEDBACK",
    };
    await approveSavedReply(dId, 2, live);
    const muted = await updateCommentTriage(suppress, prefix);
    assert.ok(muted.noReplyAt);
    assert.equal(muted.categoryOverride, "FEEDBACK");
    const mutedReview = await db.commentReview.findUniqueOrThrow({
      where: { id: dId },
    });
    assert.equal(mutedReview.replyApprovedAt, null);
    assert.equal(
      mutedReview.replyText,
      d.preview.replyText,
      "opting out keeps prior wording",
    );
    await assert.rejects(
      updateCommentTriage({ ...suppress, noReply: false }, prefix),
      /changed/,
    );
    await assert.rejects(
      approveSavedReply(dId, mutedReview.version, live),
      /blocked/,
    );
    await assert.rejects(
      updateReviewedReply(dId, mutedReview.version, "new draft"),
      /blocked/,
    );
    await assert.rejects(getApprovedReplyForCopy(dId, live), /approve/);
    const reopened = await updateCommentTriage(
      {
        ...suppress,
        categoryOverride: null,
        triageVersion: muted.triageVersion,
        noReply: false,
      },
      prefix,
    );
    assert.equal(reopened.noReplyAt, null);
    await assert.rejects(
      getApprovedReplyForCopy(dId, live),
      /approve/,
      "reopening never reapproves old wording",
    );

    const e = await make("already-answered");
    await db.adminYoutubeComment.update({
      where: { id: e.comment.id },
      data: { hasOwnerReply: true },
    });
    assert.ok(
      (
        await listUnprocessedCommentIds(connection.channelId, 5, prefix, true)
      ).some((row) => row.id === e.comment.id),
      "answered potential song still discoverable",
    );
    await assert.rejects(save(e.preview), /Already replied/);
    const songOnly = parseCommentOutput(
      JSON.stringify({
        ...e.generated,
        category: "SONG_REQUEST",
        replyAdvice: "REPLY",
      }),
      e.meta,
      false,
    );
    assert.equal(songOnly.replyText, "");
    assert.equal(songOnly.replyAdvice, "SKIP");
    const eId = await save(songOnly);
    await updateCommentReview(
      eId,
      1,
      songOnly.proposals.map((p) => ({
        ...p,
        decision: "attach",
        target: request.id,
      })),
      "",
    );
    await approveCommentReview(eId, 2, false, live);
    assert.equal(
      await db.commentReviewRequest.count({
        where: { reviewId: eId, requestId: request.id },
      }),
      1,
      "can finish associating a song after already replying",
    );
    const manual = await make("direct-source", false);
    const link = {
      commentId: manual.comment.id,
      sourceHash: manual.meta.sourceHash,
      triageVersion: 0,
      requestId: request.id,
    };
    const [first, repeated] = await Promise.all([
      linkCommentRequest(link, prefix),
      linkCommentRequest(link, prefix),
    ]);
    reviewIds.push(first.reviewId);
    assert.deepEqual(
      first,
      repeated,
      "concurrent manual links create one snapshot and association",
    );
    const source = await db.commentReview.findUniqueOrThrow({
      where: { id: first.reviewId },
    });
    assert.equal(source.sourceText, manual.comment.text);
    assert.deepEqual(
      source.proposals,
      [],
      "manual source links do not invent song details",
    );
    assert.equal(source.reviewedAt, null);
    assert.equal(source.replyText, "");
    assert.equal(
      await save(manual.preview),
      first.reviewId,
      "can draft a reply after manually linking the song",
    );
    const draft = await db.commentReview.findUniqueOrThrow({
      where: { id: first.reviewId },
    });
    assert.equal(draft.replyText, manual.preview.replyText);
    assert.equal(draft.model, manual.meta.model);
    assert.equal(
      await db.commentReviewRequest.count({
        where: { reviewId: first.reviewId },
      }),
      1,
    );
    const event = await db.reviewAuditEvent.findFirstOrThrow({
      where: { entityId: first.reviewId, action: "COMMENT_MERGED" },
    });
    const undone = await undoReviewMerge(event.id, "Wrong song", prefix);
    assert.equal(
      undone.id,
      (await undoReviewMerge(event.id, "Retry", prefix)).id,
    );
    assert.equal(
      await db.commentReviewRequest.count({
        where: { reviewId: first.reviewId },
      }),
      0,
    );
    assert.equal(
      (
        await db.commentReview.findUniqueOrThrow({
          where: { id: first.reviewId },
        })
      ).sourceText,
      manual.comment.text,
    );
    assert.equal(
      await db.songRequest.count({ where: { title: { startsWith: prefix } } }),
      1,
      "undoing direct link keeps request without manufacturing a new one",
    );
    await assert.rejects(linkCommentRequest(link, prefix), /changed/);
    const afterDismissal = await make("dismissed-link", false);
    const dismissed = await save(afterDismissal.preview);
    await dismissCommentReview(dismissed, 1);
    assert.equal(
      (
        await linkCommentRequest(
          {
            ...link,
            commentId: afterDismissal.comment.id,
            sourceHash: afterDismissal.meta.sourceHash,
          },
          prefix,
        )
      ).reviewId,
      dismissed,
    );
    assert.ok(
      (await db.commentReview.findUniqueOrThrow({ where: { id: dismissed } }))
        .dismissedAt,
    );
  } finally {
    await db.commentReviewRequest.deleteMany({
      where: { reviewId: { in: reviewIds } },
    });
    await db.commentReview.deleteMany({ where: { id: { in: reviewIds } } });
    await db.songRequest.deleteMany({
      where: { title: { startsWith: prefix }, channel: "YOUTUBE_COMMENT" },
    });
    await db.adminYoutubeComment.deleteMany({
      where: { id: { in: commentIds } },
    });
    await db.reviewAuditEvent.deleteMany({
      where: {
        OR: [
          { title: { contains: prefix } },
          { entityId: { in: reviewIds } },
          { entityId: { in: commentIds } },
          { sourceId: { in: reviewIds } },
        ],
      },
    });
    await db.$disconnect();
  }
});
