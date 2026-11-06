// Wire-level MCP test against a running server. Only unique private fixtures are
// written, then removed in finally. Does not publish content or call YouTube/AI.
// Run: node --test scripts/mcp-http.test.mjs
// Optional: MCP_TEST_URL=http://localhost:3000 (origin or full MCP endpoint).
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = fileURLToPath(new URL("../", import.meta.url));
if (existsSync(`${root}.env`)) loadEnvFile(`${root}.env`);
const endpoint = new URL(
  "/api/admin/mcp",
  process.env.MCP_TEST_URL || "http://localhost:3000",
).href;

async function rpc(method, params, token, expectedStatus = 200) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params }),
    signal: AbortSignal.timeout(60_000),
  });
  assert.equal(response.status, expectedStatus, `MCP ${method} HTTP status`);
  if (expectedStatus !== 200) return null;
  const body = await response.json();
  assert.equal(body.jsonrpc, "2.0");
  assert.ok(!body.error, `MCP ${method} returned a protocol error`);
  return body.result;
}
async function tool(name, args, token) {
  const result = await rpc("tools/call", { name, arguments: args }, token);
  assert.ok(!result.isError, `MCP tool ${name} failed`);
  return (
    result.structuredContent ||
    JSON.parse(result.content.find((item) => item.type === "text").text)
  );
}
async function denied(name, args, token, message) {
  const result = await rpc("tools/call", { name, arguments: args }, token);
  assert.equal(result.isError, true, `${name} must reject this call`);
  assert.match(
    result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n"),
    message,
  );
  return result;
}

test("HTTP MCP review preserves preview/confirmation, permissions, idempotency, audit and revocation", async () => {
  assert.ok(
    process.env.DATABASE_URL,
    "The local DB connection must be configured",
  );
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 20_000,
  });
  const prefix = `mcp-http-${randomUUID()}`;
  const writerId = `${prefix}-writer`,
    readerId = `${prefix}-reader`,
    planId = `${prefix}-plan`;
  const writerActor = `${prefix}:writer`,
    readerActor = `${prefix}:reader`;
  let connected = false;
  try {
    await db.connect();
    connected = true;
    const metadataResponse = await fetch(
      new URL("/.well-known/oauth-protected-resource", endpoint),
    );
    assert.equal(metadataResponse.status, 200);
    const { resource } = await metadataResponse.json();
    assert.equal(new URL(resource).pathname, "/api/admin/mcp");
    const credentials = new Map();
    for (const [id, actor, scopes] of [
      [
        writerId,
        writerActor,
        ["mcp:read", "mcp:draft", "mcp:review", "mcp:publish"],
      ],
      [readerId, readerActor, ["mcp:read"]],
    ]) {
      const token = `sovia_at_${randomBytes(32).toString("base64url")}`;
      const expiry = new Date(Date.now() + 15 * 60_000);
      await db.query(
        `INSERT INTO mcp_oauth_connections
        (id, actor, "clientId", "clientName", "redirectUri", resource, scopes, "expiresAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          actor,
          "mcp-http-test",
          "MCP HTTP integration fixture",
          "http://localhost/test-callback",
          resource,
          scopes,
          expiry,
        ],
      );
      await db.query(
        `INSERT INTO mcp_oauth_tokens (hash, "connectionId", kind, "expiresAt") VALUES ($1, $2, 'access', $3)`,
        [createHash("sha256").update(token).digest("hex"), id, expiry],
      );
      credentials.set(id, token);
    }
    const writer = credentials.get(writerId),
      reader = credentials.get(readerId);
    await db.query(
      `INSERT INTO admin_music_todos (id, title, status, visible, notes, "updatedAt") VALUES ($1, $2, 'PLANNING', false, $3, $4)`,
      [
        planId,
        `${prefix} private plan`,
        "Original HTTP fixture notes",
        new Date(),
      ],
    );
    const getStored = async () =>
      (
        await db.query(
          "SELECT notes, visible FROM admin_music_todos WHERE id = $1",
          [planId],
        )
      ).rows[0];
    await rpc("tools/list", {}, undefined, 401);
    await rpc("tools/list", {}, `sovia_at_invalid_${randomUUID()}`, 401);
    const initialized = await rpc(
      "initialize",
      {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "sovia-http-review-test", version: "1.0.0" },
      },
      writer,
    );
    assert.equal(initialized.protocolVersion, "2025-06-18");
    assert.ok(initialized.capabilities.tools);
    const listed = await rpc("tools/list", {}, writer);
    for (const name of [
      "review_get",
      "review_prepare",
      "review_commit",
      "review_operation",
      "review_history",
      "review_operation_schema",
    ]) {
      assert.ok(
        listed.tools.some((entry) => entry.name === name),
        `Missing MCP tool ${name}`,
      );
    }
    assert.equal(
      listed.tools.find((entry) => entry.name === "review_get").annotations
        .readOnlyHint,
      true,
    );
    assert.equal(
      listed.tools.find((entry) => entry.name === "review_commit").annotations
        .readOnlyHint,
      false,
    );
    const schema = await tool(
      "review_operation_schema",
      { operation: "plan.update" },
      writer,
    );
    assert.equal(schema.operation, "plan.update");
    assert.equal(schema.inputSchema.type, "object");
    const original = await tool(
      "review_get",
      { kind: "plan", id: planId },
      writer,
    );
    assert.equal(original.id, planId);
    assert.equal(typeof original.updatedAt, "string");
    assert.ok(Number.isFinite(Date.parse(original.updatedAt)));
    assert.equal(new URL(original.url).pathname, `/admin/todo/${planId}`);
    const proposal = {
      operation: "plan.update",
      input: {
        id: planId,
        updatedAt: original.updatedAt,
        title: original.title,
        from: original.from,
        sourceArtists: original.sourceArtists,
        sourceUrl: original.sourceUrl,
        notes: "Reviewed through MCP HTTP",
        publicSummary: original.publicSummary,
        status: original.status,
        visible: false,
      },
    };
    await denied(
      "review_prepare",
      proposal,
      reader,
      /Missing permission: mcp:review/,
    );
    await db.query(
      "UPDATE mcp_oauth_connections SET scopes = $2 WHERE id = $1",
      [writerId, ["mcp:read", "mcp:review", "offline_access"]],
    );
    const upgrade = await denied(
      "review_prepare",
      { ...proposal, input: { ...proposal.input, visible: true } },
      writer,
      /mcp:publish/,
    );
    const challenge = upgrade._meta["mcp/www_authenticate"][0];
    assert.match(challenge, /insufficient_scope/);
    assert.match(challenge, /mcp:review/);
    assert.match(challenge, /mcp:publish/);
    assert.match(challenge, /offline_access/);
    await db.query(
      "UPDATE mcp_oauth_connections SET scopes = $2 WHERE id = $1",
      [writerId, ["mcp:read", "mcp:draft", "mcp:review", "mcp:publish"]],
    );
    const ticket = await tool("review_prepare", proposal, writer);
    assert.equal(ticket.status, "AWAITING_CONFIRMATION");
    assert.equal(ticket.preview.proposed.notes, "Reviewed through MCP HTTP");
    assert.equal((await getStored()).notes, "Original HTTP fixture notes");
    const confirmation = {
      operationId: ticket.operationId,
      confirmed: true,
      confirmation: ticket.confirmation,
    };
    await denied(
      "review_commit",
      confirmation,
      reader,
      /Missing review write permission/,
    );
    await denied(
      "review_commit",
      { ...confirmation, confirmation: "APPLY wrong-operation" },
      writer,
      /confirmation does not match/,
    );
    assert.equal((await getStored()).notes, "Original HTTP fixture notes");
    const committed = await tool("review_commit", confirmation, writer);
    assert.equal(committed.status, "COMMITTED");
    assert.equal(committed.actor, writerActor);
    assert.equal(typeof committed.committedAt, "string");
    assert.equal((await getStored()).notes, "Reviewed through MCP HTTP");
    assert.equal((await getStored()).visible, false);
    assert.ok(committed.receipt.audit.length > 0);
    assert.ok(
      committed.receipt.audit.every(
        (event) => new URL(event.url).pathname === "/admin/review/history",
      ),
    );
    const beforeRetry = await db.query(
      'SELECT id FROM review_audit_events WHERE "operationId" = $1',
      [ticket.operationId],
    );
    assert.deepEqual(
      await tool("review_commit", confirmation, writer),
      committed,
    );
    assert.deepEqual(
      await tool(
        "review_operation",
        { operationId: ticket.operationId },
        writer,
      ),
      committed,
    );
    const afterRetry = await db.query(
      'SELECT id FROM review_audit_events WHERE "operationId" = $1',
      [ticket.operationId],
    );
    assert.equal(afterRetry.rowCount, beforeRetry.rowCount);
    const history = await tool(
      "review_history",
      { type: "PLAN", id: planId },
      writer,
    );
    assert.ok(
      history.events.some(
        (event) =>
          event.operationId === ticket.operationId &&
          event.actor === writerActor,
      ),
    );
    const current = await tool(
      "review_get",
      { kind: "plan", id: planId },
      reader,
    );
    assert.equal(current.notes, "Reviewed through MCP HTTP");
    await db.query(
      'UPDATE mcp_oauth_connections SET "revokedAt" = CURRENT_TIMESTAMP WHERE id = $1',
      [writerId],
    );
    await rpc("tools/list", {}, writer, 401);
    await rpc(
      "tools/call",
      { name: "review_commit", arguments: confirmation },
      writer,
      401,
    );
    assert.equal((await getStored()).visible, false);
  } finally {
    if (connected) {
      try {
        await db.query(
          "DELETE FROM mcp_review_operations WHERE actor = ANY($1::text[])",
          [[writerActor, readerActor]],
        );
        await db.query(
          "DELETE FROM review_audit_events WHERE actor = ANY($1::text[])",
          [[writerActor, readerActor]],
        );
        await db.query("DELETE FROM admin_music_todos WHERE id = $1", [planId]);
        await db.query(
          "DELETE FROM mcp_oauth_connections WHERE id = ANY($1::text[])",
          [[writerId, readerId]],
        );
      } finally {
        await db.end();
      }
    } else await db.end();
  }
});
