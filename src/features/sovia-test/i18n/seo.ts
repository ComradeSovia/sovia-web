import { SITE_NAME, SITE_URL } from "@sovia/shared";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";
import {
  DEFAULT_SOVIA_TEST_LOCALE,
  getSoviaTestLanguageAlternates,
  getSoviaTestLocalizedPath,
  type SoviaTestLocale,
} from "./config";

type SoviaTestPageMetadataInput = {
  description: string;
  locale: SoviaTestLocale;
  path: string;
  title: string;
};

export function getSoviaTestCanonicalSiteLocale(locale: SoviaTestLocale) {
  return matchSiteLocale(locale) ?? DEFAULT_SITE_LOCALE;
}

export function getSoviaTestCanonicalPath(
  path: string,
  locale: SoviaTestLocale,
) {
  return getSiteLocalizedPath(
    getSoviaTestLocalizedPath(path, locale),
    getSoviaTestCanonicalSiteLocale(locale),
  );
}

export function getSoviaTestCanonicalLanguageAlternates(path: string) {
  const alternates = getSoviaTestLanguageAlternates(path);

  return Object.fromEntries(
    Object.entries(alternates).map(([locale, localizedPath]) => {
      const testLocale = locale as SoviaTestLocale;

      return [
        testLocale,
        getSiteLocalizedPath(
          localizedPath,
          getSoviaTestCanonicalSiteLocale(testLocale),
        ),
      ];
    }),
  ) as Record<SoviaTestLocale, string>;
}

export function getSoviaTestAlternates(path: string, locale: SoviaTestLocale) {
  return {
    canonical: getSoviaTestCanonicalPath(path, locale),
    languages: {
      "x-default": getSoviaTestCanonicalPath(path, DEFAULT_SOVIA_TEST_LOCALE),
      ...getSoviaTestCanonicalLanguageAlternates(path),
    },
  };
}

export function getSoviaTestPageMetadata({
  description,
  locale,
  path,
  title,
}: SoviaTestPageMetadataInput): Pick<
  Metadata,
  "alternates" | "openGraph" | "twitter"
> {
  return {
    alternates: getSoviaTestAlternates(path, locale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: getSoviaTestCanonicalPath(path, locale),
      locale: locale.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export function createSoviaTestPageSchema({
  description,
  locale,
  path,
  title,
}: SoviaTestPageMetadataInput) {
  const canonicalPath = getSoviaTestCanonicalPath(path, locale);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${canonicalPath}`,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
