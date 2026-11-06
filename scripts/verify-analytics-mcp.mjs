// Read-only business smoke test. Credentials stay in memory and are never logged.
// Without a static read key, only a short-lived OAuth verifier fixture is created
// and removed in finally. No content, review decisions, or YouTube syncs are written.
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const url =
  process.env.MCP_VERIFY_URL ||
  new URL("/api/admin/mcp", process.env.SITE_URL || "https://sovia.work").href;
let token = process.env.SOVIA_ADMIN_MCP_API_KEY?.trim();
let verifierDb;
let verifierId;

async function verifierResource() {
  // The health-check transport is often loopback, while the production OAuth
  // audience uses the canonical site origin. Ask the running server rather
  // than reconstructing build-time/runtime URL defaults in this script.
  const response = await fetch(
    new URL("/.well-known/oauth-protected-resource", url),
    { redirect: "error", signal: AbortSignal.timeout(15_000) },
  );
  assert.equal(response.status, 200, "MCP resource metadata HTTP status");
  const metadata = await response.json();
  assert.equal(typeof metadata.resource, "string", "MCP resource is required");
  const audience = new URL(metadata.resource);
  assert.ok(
    ["http:", "https:"].includes(audience.protocol) &&
      !audience.username &&
      !audience.password &&
      !audience.search &&
      !audience.hash &&
      audience.pathname === "/api/admin/mcp",
    "MCP resource metadata must identify the MCP endpoint",
  );
  return metadata.resource;
}

async function createVerifierCredential() {
  if (token) return;
  assert.ok(
    process.env.DATABASE_URL,
    "MCP verification requires database access",
  );
  const resource = await verifierResource();
  const { default: pg } = await import("pg");
  verifierDb = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 15_000,
  });
  await verifierDb.connect();
  verifierId = `deploy-verifier-${randomUUID()}`;
  token = `sovia_at_${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await verifierDb.query("BEGIN");
  try {
    await verifierDb.query(
      `INSERT INTO mcp_oauth_connections
       (id, actor, "clientId", "clientName", "redirectUri", resource, scopes, "expiresAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        verifierId,
        "system:deploy-verifier",
        "sovia-deploy-verifier",
        "Deployment verification (read only)",
        "http://localhost/deployment-verification",
        resource,
        ["mcp:read"],
        expiresAt,
      ],
    );
    await verifierDb.query(
      `INSERT INTO mcp_oauth_tokens (hash, "connectionId", kind, "expiresAt")
       VALUES ($1, $2, 'access', $3)`,
      [createHash("sha256").update(token).digest("hex"), verifierId, expiresAt],
    );
    await verifierDb.query("COMMIT");
  } catch (error) {
    await verifierDb.query("ROLLBACK");
    throw error;
  }
}

async function rpc(method, params, credential = token, expectedStatus = 200) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params }),
    signal: AbortSignal.timeout(60_000),
  });
  assert.equal(response.status, expectedStatus, `MCP ${method} HTTP status`);
  if (expectedStatus !== 200) {
    return null;
  }
  const body = await response.json();
  assert.ok(!body.error, `MCP ${method} returned a JSON-RPC error`);
  assert.ok(!body.result?.isError, `MCP ${method} returned a tool error`);
  return body.result;
}
async function call(name, args = {}) {
  const result = await rpc("tools/call", { name, arguments: args });
  const data =
    result.structuredContent ||
    JSON.parse(result.content.find((item) => item.type === "text").text);
  assert.ok(!data.error, `Tool ${name} failed`);
  return data;
}
async function verifyReadOnlyPermission() {
  const operationId = `absent-deploy-probe-${randomUUID()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "tools/call",
      params: {
        name: "review_commit",
        arguments: {
          operationId,
          confirmed: true,
          confirmation: `APPLY ${operationId}`,
        },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200);
  const result = (await response.json()).result;
  assert.equal(
    result?.isError,
    true,
    "Read credentials must not execute review operations",
  );
  assert.ok(
    result.content?.some(
      (item) =>
        item.type === "text" &&
        item.text.includes("Missing review write permission"),
    ),
    "Review permission must be checked before looking up a proposed operation",
  );
}
try {
  await createVerifierCredential();
  await rpc("tools/list", {}, "", 401);
  await rpc("tools/list", {}, `sovia_at_invalid_${randomUUID()}`, 401);
  const initialized = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "sovia-deploy-verifier", version: "1.0.0" },
  });
  const listed = await rpc("tools/list", {});
  const names = listed.tools.map((tool) => tool.name);
  const required = [
    "analytics_channel_trends",
    "analytics_content_strategy",
    "analytics_audience_geography",
    "analysis_score_song_candidate",
    "review_list",
    "review_get",
    "review_find_duplicates",
    "review_history",
    "review_operation_schema",
    "review_prepare",
    "review_commit",
    "review_operation",
  ];
  for (const name of required)
    assert.ok(names.includes(name), `Missing deployed tool ${name}`);
  await verifyReadOnlyPermission();
  const reviewQueue = await call("review_list", { kind: "requests", limit: 1 });
  assert.ok(Array.isArray(reviewQueue.items));
  assert.equal(reviewQueue.limit, 1);
  assert.equal(typeof reviewQueue.total, "number");
  const reviewSchema = await call("review_operation_schema", {
    operation: "request.review",
  });
  assert.equal(reviewSchema.operation, "request.review");
  assert.equal(reviewSchema.inputSchema.type, "object");
  const commitTool = listed.tools.find((tool) => tool.name === "review_commit");
  assert.equal(commitTool.annotations.readOnlyHint, false);
  const searchTool = listed.tools.find(
    (tool) => tool.name === "content_search_works",
  );
  assert.equal(searchTool.annotations.readOnlyHint, true);
  assert.deepEqual(searchTool.inputSchema.properties.matchMode.enum, [
    "lexical",
  ]);
  const cohortSchema = listed.tools.find(
    (tool) => tool.name === "analytics_compare_cohort",
  ).inputSchema;
  assert.ok(cohortSchema.properties.cohort.enum.includes("sameVocalLanguage"));
  assert.ok(cohortSchema.properties.cohort.enum.includes("similarDuration"));
  assert.equal(cohortSchema.properties.matchDuration.type, "boolean");
  const trends = await call("analytics_channel_trends", { days: 7 });
  assert.equal(trends.granularity, "daily");
  assert.equal(trends.current.expectedDays, 7);
  const strategy = await call("analytics_content_strategy", { hours: 168 });
  assert.ok(Array.isArray(strategy.vocalLanguage));
  assert.ok(Array.isArray(strategy.duration));
  const audience = await call("analytics_audience_geography");
  assert.equal(typeof audience.available, "boolean");
  const empty = await call("analysis_score_song_candidate", {
    title: `Deployment smoke ${randomUUID()}`,
    hours: 168,
  });
  assert.equal(empty.version, "transparent-rules-v1");
  assert.equal(empty.status, "insufficient_evidence");
  assert.equal(empty.score, null);
  const recent = await call("content_get_recent_works", {
    hasYoutube: true,
    limit: 1,
  });
  assert.ok(
    recent.items.length > 0,
    "No existing work to verify duplicate exclusion",
  );
  const work = recent.items[0];
  assert.ok(Array.isArray(work.vocalLanguages));
  assert.ok(Object.hasOwn(work, "durationSeconds"));
  const candidate = {
    title: work.title,
    sourceTitle: work.source.title || work.title,
    hours: 168,
  };
  const existing = await call("analysis_score_song_candidate", candidate);
  assert.equal(existing.status, "excluded_existing_source");
  assert.equal(existing.score, null);
  assert.ok(existing.exactMatches > 0);
  const remake = await call("analysis_score_song_candidate", {
    ...candidate,
    allowRemake: true,
  });
  assert.notEqual(remake.status, "excluded_existing_source");
  assert.ok(remake.remakePenalty > 0);
  for (const cohort of ["sameVocalLanguage", "similarDuration"]) {
    const result = await call("analytics_compare_cohort", {
      id: work.contentId,
      cohort,
      matchDuration: true,
      hours: 168,
      limit: 10,
    });
    assert.equal(result.cohort, cohort);
    assert.equal(result.matchDuration, true);
    assert.equal(result.granularity, "publish_date_window");
  }
  console.log(
    JSON.stringify({
      ok: true,
      endpoint: new URL(url).origin,
      serverVersion: initialized.serverInfo.version,
      toolCount: names.length,
      verifiedTools: required,
      unauthorizedStatus: 401,
      invalidCredentialStatus: 401,
      readCredentialWriteDenied: true,
      reviewQueueReadable: true,
      duplicateExclusion: existing.status,
      remakeOverride: true,
      vocalAndDurationCohorts: true,
      metadataFields: true,
      dailyCacheAvailableDays: trends.current.availableDays,
      audienceCached: audience.available,
      liveYoutubeSyncTriggered: false,
    }),
  );
} finally {
  if (verifierDb) {
    try {
      if (verifierId) {
        await verifierDb.query(
          "DELETE FROM mcp_oauth_connections WHERE id = $1 AND actor = $2",
          [verifierId, "system:deploy-verifier"],
        );
      }
    } finally {
      await verifierDb.end();
    }
  }
}
