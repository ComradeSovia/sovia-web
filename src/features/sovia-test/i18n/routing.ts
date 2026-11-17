import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import {
  getSoviaTestLanguageAlternates,
  getSoviaTestLocalizedPath,
  type SoviaTestLocale,
} from "./config";

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
