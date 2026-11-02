import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertStableContentId,
  definedFields,
} from "../src/features/sound/data/write-policy.ts";
import { parseMusicPage } from "../src/features/sound/lib/pagination.ts";
test("existing identity cannot be replaced, while creation and ordinary edits remain valid", () => {
  assert.doesNotThrow(() => assertStableContentId("new"));
  assert.doesNotThrow(() => assertStableContentId("same", "same"));
  assert.throws(() => assertStableContentId("new", "old"), /cannot be changed/);
});
test("explicit field clearing survives a patch while omitted values preserve database data", () => {
  const stored = { lyrics: "old", title: "keep", source: "old" };
  const patch = definedFields({ lyrics: "", title: undefined, source: null });
  assert.deepEqual(
    { ...stored, ...patch },
    { lyrics: "", title: "keep", source: null },
  );
});
test("untrusted page parameters always produce a positive safe integer", () => {
  for (const value of [
    null,
    "",
    "abc",
    "NaN",
    "Infinity",
    "-5",
    "0",
    "1.5",
    "9007199254740992",
  ])
    assert.equal(parseMusicPage(value), 1);
  assert.equal(parseMusicPage("12"), 12);
});
