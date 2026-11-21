import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
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

const {
  contentCreateSchema,
  contentUpdateSchema,
  mergePlatformMetadata,
  mergeSubtitleTracks,
} = await import("../src/features/admin/data/mcp-content.ts");

test("subtitle changes merge by locale and null deletes only the selected track", () => {
  const original = { en: "old", ja: "keep" };
  assert.deepEqual(mergeSubtitleTracks(original, { en: null, ko: "new" }), {
    ja: "keep",
    ko: "new",
  });
  assert.deepEqual(original, { en: "old", ja: "keep" });
  assert.throws(
    () => mergeSubtitleTracks("invalid", { en: "new" }),
    /unsupported format/,
  );
});

test("YouTube localization changes preserve other languages, fields and admin metadata", () => {
  const original = {
    en: { title: "Old", description: "Keep", extra: "keep" },
    ja: { title: "Japanese" },
    __admin: {
      youtubePrimaryLocale: "en",
      subtitlePrimaryLocale: "ja",
      extra: "keep",
    },
    other: "keep",
  };
  const result = mergePlatformMetadata(original, {
    platform: "youtube",
    localizations: {
      en: { title: "New", description: null },
      ko: { title: "Korean" },
    },
    subtitlePrimaryLocale: null,
  });
  assert.deepEqual(result, {
    en: { title: "New", extra: "keep" },
    ja: { title: "Japanese" },
    ko: { title: "Korean" },
    __admin: { youtubePrimaryLocale: "en", extra: "keep" },
    other: "keep",
  });
  assert.equal(original.en.title, "Old");
  assert.throws(
    () =>
      mergePlatformMetadata(
        { en: "invalid" },
        { platform: "youtube", localizations: { en: { title: "New" } } },
      ),
    /unsupported format/,
  );
});

test("schemas reject invalid locales, duplicate platforms and metadata for unsupported platforms", () => {
  assert.equal(
    contentCreateSchema.safeParse({
      contentId: "id",
      workType: "R",
      subtitleTracks: { __proto__: "bad", "../bad": "bad" },
    }).success,
    false,
  );
  assert.equal(
    contentCreateSchema.safeParse({
      contentId: "id",
      workType: "R",
      platforms: [{ platform: "youtube" }, { platform: "youtube" }],
    }).success,
    false,
  );
  assert.equal(
    contentUpdateSchema.safeParse({
      contentId: "id",
      updatedAt: "2026-11-21T00:00:00.000Z",
      changes: {
        platforms: [
          { platform: "vk", localizations: { en: { title: "bad" } } },
        ],
      },
    }).success,
    false,
  );
  assert.deepEqual(
    mergePlatformMetadata(
      { tags: ["old"], other: "keep" },
      { platform: "pixiv", pixivTags: null },
    ),
    { other: "keep" },
  );
});
