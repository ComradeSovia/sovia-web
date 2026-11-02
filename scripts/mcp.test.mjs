import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import {
  assertMcpVisibilityChange,
  canUseMcpTool,
  toolPermission,
} from "../src/features/admin/data/mcp-policy.ts";
import { readMcpRequestJson } from "../src/features/admin/data/mcp-request.ts";
import {
  mcpCreateMusicSchema,
  mcpUpdateMusicSchema,
  mergeMcpLocaleMap,
} from "../src/features/admin/validation/mcp-music.ts";

const policy = {
  enabled: true,
  allowWrite: false,
  allowPublish: false,
  allowSync: true,
  allowOAuth: true,
  allowLegacyEnvKey: true,
};
const request = {
  contentId: "123",
  requestId: "c538138e-1070-46fe-bcb2-4eb0ce369d47",
  reason: "Correct lyrics requested by the editor",
  confirmWrite: true,
  expectedRevision: "a".repeat(64),
  patch: { lyrics: "" },
};

test("write permission requires both the admin switch and the client's grant", () => {
  assert.equal(
    canUseMcpTool(policy, ["read", "write"], "content_update_work"),
    false,
  );
  assert.equal(
    canUseMcpTool(
      { ...policy, allowWrite: true },
      ["read"],
      "content_update_work",
    ),
    false,
  );
  assert.equal(
    canUseMcpTool(
      { ...policy, allowWrite: true },
      ["read", "write"],
      "content_update_work",
    ),
    true,
  );
  assert.equal(toolPermission("content_create_work"), "write");
});
test("master switch blocks reads, writes and sync even for fully granted clients", () => {
  for (const name of [
    "content_get_work",
    "content_get_editable_work",
    "content_create_work",
    "content_update_work",
    "analytics_sync_youtube",
    "analytics_sync_youtube_comments",
  ]) {
    assert.equal(
      canUseMcpTool(
        { ...policy, enabled: false, allowWrite: true },
        ["read", "write", "sync"],
        name,
      ),
      false,
    );
  }
});
test("sync can be disabled independently of song editing and read access", () => {
  const settings = { ...policy, allowWrite: true, allowSync: false };
  assert.equal(
    canUseMcpTool(
      settings,
      ["read", "write", "sync"],
      "analytics_sync_youtube",
    ),
    false,
  );
  assert.equal(
    canUseMcpTool(settings, ["read", "write"], "content_update_work"),
    true,
  );
  assert.equal(
    canUseMcpTool(settings, ["read"], "content_get_editable_work"),
    true,
  );
  assert.equal(
    canUseMcpTool(policy, ["read"], "analytics_sync_youtube_comments"),
    false,
  );
});
test("updates retain explicit clearing and do not add omitted fields", () => {
  const parsed = mcpUpdateMusicSchema.parse({
    ...request,
    patch: { lyrics: "", fromTitle: null, subtitleTracks: { ru: null } },
  });
  assert.deepEqual(parsed.patch, {
    lyrics: "",
    fromTitle: null,
    subtitleTracks: { ru: null },
  });
  assert.equal(Object.hasOwn(parsed.patch, "songTitle"), false);
});
test("unknown or immutable fields and empty patches are rejected", () => {
  for (const patch of [
    { contentId: "other" },
    { contentType: "Event" },
    { updatedAt: "tomorrow" },
    { delete: true },
    {},
  ])
    assert.equal(
      mcpUpdateMusicSchema.safeParse({ ...request, patch }).success,
      false,
    );
});
test("writes need explicit confirmation, revision, UUID and reason", () => {
  for (const patch of [
    { confirmWrite: false },
    { confirmWrite: undefined },
    { reason: " " },
    { requestId: "same" },
    { expectedRevision: "stale" },
  ])
    assert.equal(
      mcpUpdateMusicSchema.safeParse({ ...request, ...patch }).success,
      false,
    );
});
test("untrusted field values are bounded and validated", () => {
  for (const patch of [
    { lyrics: "a".repeat(100001) },
    { fromSource: "javascript:alert(1)" },
    { path: "../admin" },
    { publishedAt: "2026-02-31" },
    { durationSeconds: -1 },
    { u2bId: "bad-id" },
    { workType: "UNKNOWN" },
    { subtitleTracks: { __admin: "bad" } },
  ])
    assert.equal(
      mcpUpdateMusicSchema.safeParse({ ...request, patch }).success,
      false,
    );
});
test("new songs require a title and work type without silently publishing", () => {
  const { expectedRevision: _, ...create } = request;
  assert.equal(mcpCreateMusicSchema.safeParse(create).success, false);
  const parsed = mcpCreateMusicSchema.parse({
    ...create,
    patch: { songTitle: "Song", workType: "O" },
  });
  assert.equal(parsed.patch.visible, undefined);
  assert.equal(
    mcpCreateMusicSchema.safeParse({
      ...create,
      patch: { songTitle: " ", workType: "O" },
    }).success,
    false,
  );
});
test("locale edits preserve other locales, unspecified fields and reserved metadata", () => {
  const current = {
    __admin: { youtubePrimaryLocale: "ru" },
    ru: { title: "Old", description: "Keep" },
    en: { title: "Remove" },
  };
  const merged = mergeMcpLocaleMap(current, {
    ru: { title: "New" },
    en: null,
    ja: { title: "新" },
  });
  assert.deepEqual(merged, {
    __admin: { youtubePrimaryLocale: "ru" },
    ru: { title: "New", description: "Keep" },
    ja: { title: "新" },
  });
  assert.equal(current.ru.title, "Old");
});
test("tool input schemas can be advertised as JSON Schema", () => {
  for (const schema of [mcpCreateMusicSchema, mcpUpdateMusicSchema]) {
    const json = z.toJSONSchema(schema);
    assert.equal(json.type, "object");
    assert.equal(json.additionalProperties, false);
    assert.ok(json.properties.patch);
  }
});

test("request parsing counts actual bytes rather than trusting content-length", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { "content-length": "1" },
    body: JSON.stringify({ text: "a".repeat(100) }),
  });
  await assert.rejects(readMcpRequestJson(request, 20), RangeError);
});
test("request parsing preserves UTF-8 across stream boundaries", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ title: "?" }));
  const body = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  const request = new Request("http://localhost", {
    method: "POST",
    body,
    duplex: "half",
  });
  assert.deepEqual(await readMcpRequestJson(request, bytes.length), {
    title: "?",
  });
});
test("empty and malformed JSON requests fail without entering a tool", async () => {
  await assert.rejects(
    readMcpRequestJson(new Request("http://localhost")),
    SyntaxError,
  );
  await assert.rejects(
    readMcpRequestJson(
      new Request("http://localhost", { method: "POST", body: "bad" }),
    ),
    SyntaxError,
  );
});

test("publishing and hiding require explicit visibility permission", () => {
  assert.throws(
    () => assertMcpVisibilityChange({ allowPublish: false }, false, true),
    /publishing permission/,
  );
  assert.throws(
    () => assertMcpVisibilityChange({ allowPublish: false }, true, false),
    /publishing permission/,
  );
  assert.doesNotThrow(() =>
    assertMcpVisibilityChange({ allowPublish: false }, true, undefined),
  );
  assert.doesNotThrow(() =>
    assertMcpVisibilityChange({ allowPublish: false }, true, true),
  );
  assert.doesNotThrow(() =>
    assertMcpVisibilityChange({ allowPublish: true }, false, true),
  );
});
