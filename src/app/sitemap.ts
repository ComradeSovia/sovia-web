import { SITE_URL } from "@sovia/shared";
import { SITE_LOCALES } from "@sovia/shared/i18n/site-locale";
import {
  getSiteLanguageAlternates,
  getSiteLocalizedPath,
} from "@sovia/shared/i18n/site-routing";
import { loadMusicIndex } from "@sovia/sound";
import {
  DEFAULT_SOVIA_TEST_LOCALE,
  SOVIA_TEST_LOCALES,
} from "@sovia/sovia-test/i18n/config";
import { getDefaultSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import {
  getSoviaTestCanonicalLanguageAlternates,
  getSoviaTestCanonicalPath,
} from "@sovia/sovia-test/i18n/seo";
import type { MetadataRoute } from "next";

const STATIC_PATHS = [
  "/",
  "/sound",
  "/lyrics-library",
  "/music-release",
  "/concept-design",
  "/video-images",
  "/community",
  "/tools",
  "/tools/air-con",
] as const;

const SOVIA_TEST_PATHS = ["/test", "/test/types"] as const;

function absoluteUrl(path: string) {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function getAbsoluteLanguageAlternates(path: string) {
  const alternates = getSoviaTestCanonicalLanguageAlternates(path);

  return Object.fromEntries([
    [
      "x-default",
      absoluteUrl(getSoviaTestCanonicalPath(path, DEFAULT_SOVIA_TEST_LOCALE)),
    ],
    ...SOVIA_TEST_LOCALES.map((locale) => [
      locale,
      absoluteUrl(alternates[locale]),
    ]),
  ]);
}

function getAbsoluteSiteLanguageAlternates(path: string) {
  const alternates = getSiteLanguageAlternates(path);

  return Object.fromEntries([
    ["x-default", absoluteUrl(getSiteLocalizedPath(path, "en-US"))],
    ...SITE_LOCALES.map((locale) => [locale, absoluteUrl(alternates[locale])]),
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    SITE_LOCALES.map((locale) => ({
      url: absoluteUrl(getSiteLocalizedPath(path, locale)),
      changeFrequency: path === "/sound" ? "daily" : "weekly",
      priority: path === "/" ? 1 : path === "/sound" ? 0.9 : 0.7,
      alternates: {
        languages: getAbsoluteSiteLanguageAlternates(path),
      },
    })),
  );

  const testCopy = getDefaultSoviaTestCopy();
  const testTypePaths = Object.keys(testCopy.types).map(
    (type) => `/test/type/${type.toLowerCase()}`,
  );
  const soviaTestRoutes: MetadataRoute.Sitemap = [
    ...SOVIA_TEST_PATHS,
    ...testTypePaths,
  ].flatMap((path) =>
    SOVIA_TEST_LOCALES.map((locale) => ({
      url: absoluteUrl(getSoviaTestCanonicalPath(path, locale)),
      changeFrequency: "weekly",
      priority: path === "/test" ? 0.8 : 0.65,
      alternates: {
        languages: getAbsoluteLanguageAlternates(path),
      },
    })),
  );

  const workRoutes: MetadataRoute.Sitemap = (await loadMusicIndex())
    .filter((work) => work.u2bId)
    .flatMap((work) => {
      const path = `/sound/${work.path}`;

      return SITE_LOCALES.map((locale) => ({
        url: absoluteUrl(getSiteLocalizedPath(path, locale)),
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: getAbsoluteSiteLanguageAlternates(path),
        },
      }));
    });

  return [...staticRoutes, ...soviaTestRoutes, ...workRoutes];
}
