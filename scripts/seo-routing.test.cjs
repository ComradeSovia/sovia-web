const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { NextRequest } = require("next/server");
const root = path.resolve(__dirname, "..");
const cache = new Map();
const work = { path: "310_o", u2bId: "video", title: "Work" };
const navigation = {
  notFound() {
    throw new Error("NOT_FOUND");
  },
  permanentRedirect(url) {
    throw new Error(`REDIRECT:${url}`);
  },
};
// Load repository TypeScript in Node without starting Next or connecting to a DB.
function load(file) {
  const filename = ["", ".ts", ".tsx", "/index.ts"]
    .map((s) => file + s)
    .find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!filename) throw new Error(`Missing module: ${file}`);
  if (filename.endsWith(".json"))
    return JSON.parse(fs.readFileSync(filename, "utf8"));
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  function localRequire(specifier) {
    if (specifier === "next/navigation") return navigation;
    if (specifier === "@sovia/home") return { CharactersPage: () => null };
    if (specifier === "@sovia/shared")
      return load(path.join(root, "src/shared/config/site.ts"));
    if (specifier === "@sovia/sound")
      return {
        loadMusicWorkWithContent: async () => work,
        getWorkDescription: () => "Description",
        getLocalizedWorkTitle: () => "Work",
        SoundDetail: () => null,
      };
    if (specifier === "@sovia/shared/i18n/server")
      return { getCurrentSiteLocale: async () => "ko-KR" };
    if (specifier.startsWith("@sovia/")) {
      const suffix = specifier.slice(7);
      return load(
        path.join(
          root,
          "src",
          suffix.startsWith("shared/") ? suffix : `features/${suffix}`,
        ),
      );
    }
    if (specifier.startsWith("."))
      return load(path.resolve(path.dirname(filename), specifier));
    return require(specifier);
  }
  new Function("require", "module", "exports", source)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
(async () => {
  const { proxy } = load(path.join(root, "src/proxy.ts"));
  const { SITE_LOCALES } = load(
    path.join(root, "src/shared/i18n/site-locale.ts"),
  );
  const { SOVIA_TEST_LOCALES } = load(
    path.join(root, "src/features/sovia-test/i18n/config.ts"),
  );
  const { getSoviaTestCanonicalPath } = load(
    path.join(root, "src/features/sovia-test/i18n/routing.ts"),
  );
  for (const locale of SOVIA_TEST_LOCALES) {
    const canonical = getSoviaTestCanonicalPath(
      "/lab/sovia-test/type/feqma",
      locale,
    );
    for (const outer of SITE_LOCALES) {
      const original = `/${outer}/lab/sovia-test/${locale}/type/feqma`;
      const response = proxy(
        new NextRequest(`https://sovia.work${original}?source=test`, {
          headers: {
            cookie: "sovia-site-locale=zh-TW",
            "accept-language": "ko-KR",
          },
        }),
      );
      if (original === canonical) {
        assert.equal(
          new URL(
            response.headers.get("x-middleware-rewrite"),
          ).searchParams.get("lang"),
          locale,
        );
      } else {
        assert.equal(response.status, 308);
        assert.equal(
          new URL(response.headers.get("location")).pathname,
          canonical,
        );
        assert.equal(
          new URL(response.headers.get("location")).searchParams.get("source"),
          "test",
        );
      }
    }
  }
  for (const original of [
    "/test/ja-JP/types/FEQMA",
    "/ko-KR/test/ja-JP/type/FEQMA",
  ]) {
    const response = proxy(new NextRequest(`https://sovia.work${original}`));
    assert.equal(response.status, 308);
    assert.equal(
      new URL(response.headers.get("location")).pathname,
      "/ja-JP/lab/sovia-test/ja-JP/type/feqma",
    );
  }
  const result = proxy(
    new NextRequest(
      "https://sovia.work/ko-KR/test/ja-JP/result/FEQMA/AbC123?source=share",
    ),
  );
  assert.equal(
    new URL(result.headers.get("location")).pathname,
    "/ja-JP/lab/sovia-test/ja-JP/result/FEQMA/AbC123",
  );
  assert.equal(
    new URL(result.headers.get("location")).searchParams.get("source"),
    "share",
  );
  const entry = proxy(
    new NextRequest("https://sovia.work/lab/sovia-test", {
      headers: { "accept-language": "ja-JP" },
    }),
  );
  assert.equal(entry.status, 307);
  assert.equal(
    new URL(entry.headers.get("location")).pathname,
    "/ja-JP/lab/sovia-test/ja-JP",
  );
  const { createMusicRecordingSchema } = load(
    path.join(root, "src/shared/seo/schema.ts"),
  );
  for (const locale of SITE_LOCALES) {
    const graph = createMusicRecordingSchema({
      locale,
      path: work.path,
      title: "Work",
    })["@graph"];
    assert.ok(
      graph.some(
        (node) =>
          node["@type"] === "WebPage" &&
          node.url.endsWith(`/${locale}/sound/310_o`),
      ),
    );
    const page = load(
      path.join(root, "src/app/(site)/[lang]/sound/[path]/page.tsx"),
    );
    const metadata = await page.generateMetadata({
      params: Promise.resolve({ lang: locale, path: "310" }),
    });
    assert.equal(metadata.alternates.canonical, `/${locale}/sound/310_o`);
    await assert.rejects(
      page.default({ params: Promise.resolve({ lang: locale, path: "310" }) }),
      { message: `REDIRECT:/${locale}/sound/310_o` },
    );
    await page.default({
      params: Promise.resolve({ lang: locale, path: "310_o" }),
    });
  }
  const characterPage = load(
    path.join(root, "src/app/(site)/characters/[id]/page.tsx"),
  );
  for (const id of ["katya", "runa"]) {
    const metadata = await characterPage.generateMetadata({
      params: Promise.resolve({ id }),
    });
    assert.equal(metadata.alternates.canonical, `/ko-KR/characters/${id}`);
    assert.ok(metadata.openGraph.url.endsWith(`/ko-KR/characters/${id}`));
    await characterPage.default({ params: Promise.resolve({ id }) });
  }
  await assert.rejects(
    characterPage.default({ params: Promise.resolve({ id: "kata" }) }),
    { message: "REDIRECT:/ko-KR/characters/katya" },
  );
  const character = load(path.join(root, "src/shared/seo/character-path.ts"));
  assert.equal(character.getCharacterPath("kata"), "/characters/katya");
  assert.equal(character.getCharacterPath("runa"), "/characters/runa");
  console.log(
    "SEO routing checks passed: 138 language combinations, legacy/result URLs, six sound canonicals and JSON-LD, character paths.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
