import { SITE_URL } from "@sovia/shared";
import { loadMusicIndex } from "@sovia/sound";
import {
  DEFAULT_SOVIA_TEST_LOCALE,
  getSoviaTestLanguageAlternates,
  getSoviaTestLocalizedPath,
  SOVIA_TEST_LOCALES,
} from "@sovia/sovia-test/i18n/config";
import { getDefaultSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import type { MetadataRoute } from "next";

const STATIC_PATHS = [
  "/",
  "/sound",
  "/lyrics-library",
  "/music-release",
  "/concept-design",
  "/video-images",
  "/community",
] as const;

const SOVIA_TEST_PATHS = ["/test", "/test/types"] as const;

function absoluteUrl(path: string) {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function getAbsoluteLanguageAlternates(path: string) {
  const alternates = getSoviaTestLanguageAlternates(path);

  return Object.fromEntries([
    [
      "x-default",
      absoluteUrl(getSoviaTestLocalizedPath(path, DEFAULT_SOVIA_TEST_LOCALE)),
    ],
    ...SOVIA_TEST_LOCALES.map((locale) => [
      locale,
      absoluteUrl(alternates[locale]),
    ]),
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/sound" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/sound" ? 0.9 : 0.7,
  }));

  const testCopy = getDefaultSoviaTestCopy();
  const testTypePaths = Object.keys(testCopy.types).map(
    (type) => `/test/type/${type.toLowerCase()}`,
  );
  const soviaTestRoutes: MetadataRoute.Sitemap = [
    ...SOVIA_TEST_PATHS,
    ...testTypePaths,
  ].map((path) => ({
    url: absoluteUrl(getSoviaTestLocalizedPath(path, "en-US")),
    changeFrequency: "weekly",
    priority: path === "/test" ? 0.8 : 0.65,
    alternates: {
      languages: getAbsoluteLanguageAlternates(path),
    },
  }));

  const workRoutes: MetadataRoute.Sitemap = (await loadMusicIndex())
    .filter((work) => work.u2bId)
    .map((work) => ({
      url: `${SITE_URL}/sound/${work.path}`,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...soviaTestRoutes, ...workRoutes];
}
