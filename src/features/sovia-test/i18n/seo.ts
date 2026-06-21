import {
  DEFAULT_SOVIA_TEST_LOCALE,
  getSoviaTestLanguageAlternates,
  getSoviaTestLocalizedPath,
  type SoviaTestLocale,
} from "./config";

export function getSoviaTestAlternates(path: string, locale: SoviaTestLocale) {
  return {
    canonical: getSoviaTestLocalizedPath(path, locale),
    languages: {
      "x-default": getSoviaTestLocalizedPath(path, DEFAULT_SOVIA_TEST_LOCALE),
      ...getSoviaTestLanguageAlternates(path),
    },
  };
}
