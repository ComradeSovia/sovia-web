// Read-only deployment smoke test. Credentials stay in memory and are never logged.
// Run inside the existing production container; no YouTube sync tools are called.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";

const url =
  process.env.MCP_VERIFY_URL ||
  new URL("/api/admin/mcp", process.env.SITE_URL || "https://sovia.work").href;
const secret =
  process.env.SOVIA_ADMIN_MCP_OAUTH_SECRET?.trim() ||
  process.env.SOVIA_ADMIN_SESSION_SECRET?.trim() ||
  process.env.SOVIA_ADMIN_MCP_API_KEY?.trim();
assert.ok(secret, "MCP authentication is not configured");
const now = Math.floor(Date.now() / 1000);
const encoded = Buffer.from(
  JSON.stringify({
    kind: "access",
    subject: "sovia-admin",
    clientId:
      process.env.SOVIA_ADMIN_MCP_OAUTH_CLIENT_ID?.trim() || "chatgpt-mcp",
    scope: "mcp:read",
    issuedAt: now,
    expiresAt: now + 300,
  }),
).toString("base64url");
const token = `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
async function rpc(method, params, authorized = true) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorized ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!authorized) {
    assert.equal(
      response.status,
      401,
      "Unauthenticated MCP requests must be rejected",
    );
    return null;
  }
  assert.equal(response.status, 200, `MCP ${method} HTTP status`);
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
await rpc("tools/list", {}, false);
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
];
for (const name of required)
  assert.ok(names.includes(name), `Missing deployed tool ${name}`);
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
    duplicateExclusion: existing.status,
    remakeOverride: true,
    vocalAndDurationCohorts: true,
    metadataFields: true,
    dailyCacheAvailableDays: trends.current.availableDays,
    audienceCached: audience.available,
    liveYoutubeSyncTriggered: false,
  }),
);
