// DB integration: uses only uniquely prefixed fixtures and removes them in finally.
// No AI generation, YouTube requests, public publication, or messages are sent.
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
    if (specifier === "@sovia/shared") {
      return {
        url: `data:text/javascript,${encodeURIComponent('export const SITE_NAME = "Sovia"; export const siteUrl = (path) => new URL(path, "https://sovia.work").href;')}`,
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
const { prepareMcpOperation, commitMcpOperation, getMcpOperation } =
  await import("../src/features/admin/data/mcp-operations.ts");
const { handleReviewReadTool } = await import(
  "../src/features/admin/data/mcp-review.ts"
);
const db = planningPrisma();
after(async () => db.$disconnect());

const scopes = [
  "mcp:read",
  "mcp:draft",
  "mcp:review",
  "mcp:publish",
  "mcp:sync",
];
const confirm = (ticket) => ({
  operationId: ticket.operationId,
  confirmed: true,
  confirmation: ticket.confirmation,
});
async function principal(prefix, suffix = "owner", permissions = scopes) {
  const connection = await db.mcpOAuthConnection.create({
    data: {
      id: `${prefix}-${suffix}`,
      actor: `${prefix}:${suffix}`,
      clientId: "mcp-integration-test",
      clientName: "MCP integration fixture",
      redirectUri: "http://localhost/test-callback",
      resource: "https://sovia.work/api/admin/mcp",
      scopes: permissions,
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  return { id: connection.id, actor: connection.actor, scopes: permissions };
}
async function cleanup(prefix) {
  const drafts = await db.musicPlanningDraft.findMany({
    where: { sourceName: { startsWith: prefix } },
    select: { id: true },
  });
  const plans = await db.adminMusicTodo.findMany({
    where: { title: { startsWith: prefix } },
    select: { id: true },
  });
  const requests = await db.songRequest.findMany({
    where: { title: { startsWith: prefix } },
    select: { id: true },
  });
  const draftIds = drafts.map((row) => row.id),
    planIds = plans.map((row) => row.id),
    requestIds = requests.map((row) => row.id);
  await db.mcpReviewOperation.deleteMany({
    where: { actor: { startsWith: `${prefix}:` } },
  });
  await db.reviewAuditEvent.deleteMany({
    where: { actor: { startsWith: `${prefix}:` } },
  });
  await db.musicPlanningDraftPlan.deleteMany({
    where: { draftId: { in: draftIds } },
  });
  await db.songRequestPlan.deleteMany({
    where: { requestId: { in: requestIds } },
  });
  // Break only fixture-owned request/import source cycles before deletion.
  await db.musicPlanningDraft.updateMany({
    where: { id: { in: draftIds } },
    data: { originalRequestId: null },
  });
  await db.songRequest.deleteMany({ where: { id: { in: requestIds } } });
  await db.musicPlanningDraft.deleteMany({ where: { id: { in: draftIds } } });
  await db.musicPlanWork.deleteMany({ where: { planId: { in: planIds } } });
  await db.adminMusicTodo.deleteMany({ where: { id: { in: planIds } } });
  await db.musicWork.deleteMany({
    where: { contentId: { startsWith: prefix } },
  });
  await db.mcpOAuthConnection.deleteMany({
    where: { id: { startsWith: prefix } },
  });
}
async function fixture(run) {
  const prefix = `mcp-review-${randomUUID()}`;
  try {
    await run(prefix, await principal(prefix));
  } finally {
    await cleanup(prefix);
  }
}
async function makePlan(prefix, suffix = "plan") {
  return db.adminMusicTodo.create({
    data: {
      id: `${prefix}-${suffix}`,
      title: `${prefix} ${suffix}`,
      status: "PLANNING",
      notes: "Original notes",
      visible: false,
    },
  });
}
function planInput(plan, extra = {}) {
  return {
    id: plan.id,
    updatedAt: plan.updatedAt.toISOString(),
    title: plan.title,
    from: plan.from,
    sourceArtists: plan.sourceArtists,
    sourceUrl: plan.sourceUrl,
    notes: plan.notes,
    publicSummary: plan.publicSummary,
    status: plan.status,
    visible: plan.visible,
    ...extra,
  };
}
async function apply(operation, input, actor) {
  const ticket = await prepareMcpOperation({ operation, input }, actor);
  return commitMcpOperation(confirm(ticket), actor);
}
function proposal(prefix, overrides = {}) {
  return {
    key: "one",
    title: `${prefix} candidate`,
    from: "Fixture album",
    sourceArtists: "Fixture artist",
    sourceUrl: "",
    requestedChanges: "A piano version",
    notes: "Review the arrangement",
    publicSummary: "Piano arrangement",
    missingInfo: "",
    evidenceQuotes: ["Please make a piano version."],
    decision: "create",
    target: "",
    allowDuplicate: false,
    ...overrides,
  };
}
function draftInput(prefix, proposals = [proposal(prefix)]) {
  return {
    sourceName: `${prefix} original conversation`,
    sourceText: `${prefix}\nPlease make a piano version.\nKeep the original melody.`,
    sourceUrl: "https://example.com/original-conversation",
    requestId: null,
    requestVersion: null,
    model: "mcp-reviewed-test",
    promptKey: "mcp-reviewed",
    proposals,
  };
}

test("MCP changes require exact confirmation and return an idempotent receipt with correlated audit", async () =>
  fixture(async (prefix, actor) => {
    const plan = await makePlan(prefix);
    const ticket = await prepareMcpOperation(
      {
        operation: "plan.update",
        input: planInput(plan, { notes: "Reviewed new notes" }),
      },
      actor,
    );
    assert.equal(ticket.status, "AWAITING_CONFIRMATION");
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: plan.id } }))
        .notes,
      "Original notes",
    );
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { operationId: ticket.operationId },
      }),
      0,
    );
    await assert.rejects(
      commitMcpOperation({ ...confirm(ticket), confirmed: false }, actor),
    );
    await assert.rejects(
      commitMcpOperation(
        { ...confirm(ticket), confirmation: "APPLY some-other-operation" },
        actor,
      ),
      /confirmation does not match/,
    );
    const result = await commitMcpOperation(confirm(ticket), actor);
    assert.equal(result.status, "COMMITTED");
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: plan.id } }))
        .notes,
      "Reviewed new notes",
    );
    const events = await db.reviewAuditEvent.findMany({
      where: { operationId: ticket.operationId },
    });
    assert.ok(events.length > 0);
    assert.ok(
      events.every(
        (event) => event.actor === actor.actor && event.entityId === plan.id,
      ),
    );
    assert.deepEqual(
      result.receipt.audit.map((event) => event.id).sort(),
      events.map((event) => event.id).sort(),
    );
    assert.ok(
      result.receipt.audit.every(
        (event) => new URL(event.url).pathname === "/admin/review/history",
      ),
    );
    assert.deepEqual(await commitMcpOperation(confirm(ticket), actor), result);
    assert.deepEqual(await getMcpOperation(ticket.operationId, actor), result);
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { operationId: ticket.operationId },
      }),
      events.length,
    );
  }));

test("MCP preview/commit enforces connection ownership, live revocation and scopes", async () =>
  fixture(async (prefix, actor) => {
    const plan = await makePlan(prefix);
    const other = await principal(prefix, "other");
    const reader = await principal(prefix, "reader", ["mcp:read"]);
    const input = planInput(plan, { notes: "Permission-gated change" });
    await assert.rejects(
      prepareMcpOperation({ operation: "plan.update", input }, reader),
      /Missing permission/,
    );
    const ticket = await prepareMcpOperation(
      { operation: "plan.update", input },
      actor,
    );
    await assert.rejects(
      getMcpOperation(ticket.operationId, other),
      /not found for this connection/,
    );
    await assert.rejects(
      commitMcpOperation(confirm(ticket), other),
      /not found for this connection/,
    );
    await assert.rejects(
      commitMcpOperation(confirm(ticket), { ...actor, scopes: ["mcp:read"] }),
      /Missing permission/,
    );
    await db.mcpOAuthConnection.update({
      where: { id: actor.id },
      data: { revokedAt: new Date() },
    });
    await assert.rejects(
      commitMcpOperation(confirm(ticket), actor),
      /revoked or lost permission/,
    );
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: plan.id } }))
        .notes,
      "Original notes",
    );
    assert.equal(
      (
        await db.mcpReviewOperation.findUniqueOrThrow({
          where: { id: ticket.operationId },
        })
      ).committedAt,
      null,
    );
  }));

test("stale plans and expired previews fail without business or audit writes", async () =>
  fixture(async (prefix, actor) => {
    const plan = await makePlan(prefix);
    const ticket = await prepareMcpOperation(
      {
        operation: "plan.update",
        input: planInput(plan, { notes: "Stale proposed text" }),
      },
      actor,
    );
    await db.adminMusicTodo.update({
      where: { id: plan.id },
      data: {
        notes: "Newer editor text",
        updatedAt: new Date(plan.updatedAt.getTime() + 1000),
      },
    });
    await assert.rejects(commitMcpOperation(confirm(ticket), actor), /changed/);
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: plan.id } }))
        .notes,
      "Newer editor text",
    );
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { operationId: ticket.operationId },
      }),
      0,
    );
    const latest = await db.adminMusicTodo.findUniqueOrThrow({
      where: { id: plan.id },
    });
    const expired = await prepareMcpOperation(
      {
        operation: "plan.update",
        input: planInput(latest, { notes: "Expired proposed text" }),
      },
      actor,
    );
    await db.mcpReviewOperation.update({
      where: { id: expired.operationId },
      data: { expiresAt: new Date(0) },
    });
    await assert.rejects(
      commitMcpOperation(confirm(expired), actor),
      /expired/,
    );
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: plan.id } }))
        .notes,
      "Newer editor text",
    );
  }));

test("publishing requires a separate scope and commit rechecks stored permissions", async () =>
  fixture(async (prefix) => {
    const plan = await makePlan(prefix);
    const reviewer = await principal(prefix, "reviewer", [
      "mcp:read",
      "mcp:draft",
      "mcp:review",
    ]);
    const publisherOnly = await principal(prefix, "publisher-only", [
      "mcp:read",
      "mcp:publish",
    ]);
    await assert.rejects(
      prepareMcpOperation(
        { operation: "plan.update", input: planInput(plan, { visible: true }) },
        publisherOnly,
      ),
      /mcp:review/,
    );
    await assert.rejects(
      prepareMcpOperation(
        { operation: "plan.update", input: planInput(plan, { visible: true }) },
        reviewer,
      ),
      /mcp:publish/,
    );
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: plan.id } }))
        .visible,
      false,
    );
    // Even a valid caller context cannot override revoked server-side permissions.
    const ticket = await prepareMcpOperation(
      {
        operation: "plan.update",
        input: planInput(plan, { notes: "Private plan change" }),
      },
      reviewer,
    );
    await db.mcpOAuthConnection.update({
      where: { id: reviewer.id },
      data: { scopes: ["mcp:read"] },
    });
    await assert.rejects(
      commitMcpOperation(confirm(ticket), reviewer),
      /revoked or lost permission/,
    );
  }));

test("chat drafts preserve evidence through edit, adoption, Work association and merge undo", async () =>
  fixture(async (prefix, actor) => {
    const target = await makePlan(prefix, "target");
    const input = draftInput(prefix);
    const saved = await apply("draft.save", input, actor);
    const draftId = saved.receipt.result.id;
    assert.ok(draftId);
    let draft = await db.musicPlanningDraft.findUniqueOrThrow({
      where: { id: draftId },
    });
    assert.equal(draft.status, "DRAFT");
    assert.equal(
      await db.songRequest.count({ where: { sourceDraftId: draftId } }),
      0,
    );
    const edited = [
      {
        ...draft.proposals[0],
        decision: "merge",
        target: target.id,
        notes: "Reviewed arrangement direction",
      },
    ];
    await apply(
      "draft.update",
      { id: draftId, version: draft.version, proposals: edited },
      actor,
    );
    draft = await db.musicPlanningDraft.findUniqueOrThrow({
      where: { id: draftId },
    });
    const adopted = await apply(
      "draft.adopt",
      { id: draftId, version: draft.version },
      actor,
    );
    const imported = await db.songRequest.findFirstOrThrow({
      where: { sourceDraftId: draftId },
    });
    assert.equal(imported.sourceProposalKey, "one");
    assert.equal(imported.channel, "CHAT_IMPORT");
    const merge = await db.reviewAuditEvent.findFirstOrThrow({
      where: { operationId: adopted.operationId, action: "REQUEST_MERGED" },
    });
    const work = await db.musicWork.create({
      data: {
        contentId: `${prefix}-work`,
        workType: "R",
        status: { create: { visible: false } },
      },
    });
    let latest = await db.adminMusicTodo.findUniqueOrThrow({
      where: { id: target.id },
    });
    await apply(
      "plan.link_work",
      {
        planId: target.id,
        updatedAt: latest.updatedAt.toISOString(),
        contentId: work.contentId,
        match: "RELATED",
        notes: "A related completed recording",
      },
      actor,
    );
    latest = await db.adminMusicTodo.findUniqueOrThrow({
      where: { id: target.id },
    });
    await apply(
      "plan.update",
      planInput(latest, { notes: "Later independent production notes" }),
      actor,
    );
    const undone = await apply(
      "merge.undo",
      {
        eventId: merge.id,
        reason: "These requests concern different adaptations.",
      },
      actor,
    );
    assert.equal(undone.status, "COMMITTED");
    const preserved = await db.musicPlanningDraft.findUniqueOrThrow({
      where: { id: draftId },
    });
    assert.equal(preserved.sourceText, input.sourceText);
    assert.equal(preserved.sourceUrl, input.sourceUrl);
    assert.deepEqual(
      preserved.proposals[0].evidenceQuotes,
      input.proposals[0].evidenceQuotes,
    );
    assert.equal(preserved.status, "APPLIED");
    assert.equal(
      await db.songRequestPlan.count({
        where: { requestId: imported.id, planId: target.id },
      }),
      0,
    );
    assert.equal(
      (await db.songRequest.findUniqueOrThrow({ where: { id: imported.id } }))
        .sourceDraftId,
      draftId,
    );
    assert.equal(
      await db.musicPlanWork.count({
        where: { planId: target.id, contentId: work.contentId },
      }),
      1,
    );
    assert.equal(
      (await db.adminMusicTodo.findUniqueOrThrow({ where: { id: target.id } }))
        .notes,
      "Later independent production notes",
    );
    const undoAudit = await db.reviewAuditEvent.findUniqueOrThrow({
      where: { undoOfId: merge.id },
    });
    assert.equal(undoAudit.operationId, undone.operationId);
    const readBack = await handleReviewReadTool("review_get", {
      kind: "draft",
      id: draftId,
    });
    assert.equal(readBack.sourceText, input.sourceText);
    assert.ok(new URL(readBack.url).pathname.endsWith(draftId));
  }));

test("invalid evidence is rejected and failed multi-plan adoption rolls back every partial change", async () =>
  fixture(async (prefix, actor) => {
    const input = draftInput(prefix);
    await assert.rejects(
      prepareMcpOperation(
        {
          operation: "draft.save",
          input: {
            ...input,
            proposals: [
              proposal(prefix, { evidenceQuotes: ["Fabricated source text"] }),
            ],
          },
        },
        actor,
      ),
      /source quote/,
    );
    assert.equal(
      await db.musicPlanningDraft.count({
        where: { sourceName: input.sourceName },
      }),
      0,
    );
    const invalidBatch = draftInput(prefix, [
      proposal(prefix, { title: `${prefix} first create` }),
      proposal(prefix, {
        key: "two",
        title: `${prefix} missing target`,
        decision: "merge",
        target: `${prefix}-missing-plan`,
      }),
    ]);
    const saved = await apply("draft.save", invalidBatch, actor);
    const draftId = saved.receipt.result.id;
    const draft = await db.musicPlanningDraft.findUniqueOrThrow({
      where: { id: draftId },
    });
    const ticket = await prepareMcpOperation(
      {
        operation: "draft.adopt",
        input: { id: draftId, version: draft.version },
      },
      actor,
    );
    await assert.rejects(
      commitMcpOperation(confirm(ticket), actor),
      /existing, non-cancelled plan/,
    );
    assert.equal(
      await db.adminMusicTodo.count({
        where: { title: { startsWith: prefix } },
      }),
      0,
    );
    assert.equal(
      await db.songRequest.count({ where: { sourceDraftId: draftId } }),
      0,
    );
    assert.equal(
      await db.reviewAuditEvent.count({
        where: { operationId: ticket.operationId },
      }),
      0,
    );
    assert.equal(
      (
        await db.musicPlanningDraft.findUniqueOrThrow({
          where: { id: draftId },
        })
      ).status,
      "DRAFT",
    );
    assert.equal(
      (
        await db.mcpReviewOperation.findUniqueOrThrow({
          where: { id: ticket.operationId },
        })
      ).committedAt,
      null,
    );
    await assert.rejects(
      prepareMcpOperation(
        {
          operation: "draft.update",
          input: {
            id: draftId,
            version: draft.version,
            proposals: invalidBatch.proposals.map((p) => ({
              ...p,
              evidenceQuotes: ["Keep the original melody."],
            })),
          },
        },
        actor,
      ),
      /original evidence cannot be overwritten/,
    );
    assert.deepEqual(
      (
        await db.musicPlanningDraft.findUniqueOrThrow({
          where: { id: draftId },
        })
      ).proposals,
      invalidBatch.proposals,
    );
  }));

test("recommendation approval preserves original submitted fields and exposes source/audit links", async () =>
  fixture(async (prefix, actor) => {
    const request = await db.songRequest.create({
      data: {
        id: `${prefix}-request`,
        title: `${prefix} song`,
        artist: "Original artist",
        origin: "Original album",
        sourceUrl: "https://example.com/original-song",
        ideas: "Keep the original request exactly.",
      },
    });
    const plan = await makePlan(prefix);
    const result = await apply(
      "request.review",
      {
        id: request.id,
        updatedAt: request.updatedAt.toISOString(),
        decision: "ACCEPTED",
        reviewNotes: "Reviewed original evidence",
        planId: plan.id,
        draft: null,
      },
      actor,
    );
    const original = await db.songRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    for (const field of [
      "title",
      "artist",
      "origin",
      "sourceUrl",
      "ideas",
      "channel",
    ])
      assert.equal(original[field], request[field]);
    assert.equal(original.status, "ACCEPTED");
    assert.equal(
      await db.songRequestPlan.count({
        where: { requestId: request.id, planId: plan.id },
      }),
      1,
    );
    const detail = await handleReviewReadTool("review_get", {
      kind: "request",
      id: request.id,
    });
    assert.ok(detail.sourceText.includes(request.ideas));
    assert.ok(detail.sourceText.includes(request.sourceUrl));
    assert.ok(
      result.receipt.audit.some((event) => event.action === "REQUEST_MERGED"),
    );
  }));
