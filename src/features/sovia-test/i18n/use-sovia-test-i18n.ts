"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SOVIA_TEST_LOCALE,
  getSoviaTestLocaleFromPath,
  getSoviaTestLocalizedPath,
  matchSoviaTestLocale,
  SOVIA_TEST_LOCALE_STORAGE_KEY,
  SOVIA_TEST_LOCALES,
  type SoviaTestLocale,
  stripSoviaTestLocaleFromPath,
} from "./config";
import { getSoviaTestCopy } from "./copy";

function detectBrowserLocale(initialLocale?: SoviaTestLocale) {
  if (initialLocale) {
    return initialLocale;
  }

  if (typeof window === "undefined") {
    return DEFAULT_SOVIA_TEST_LOCALE;
  }

  const pathLocale = getSoviaTestLocaleFromPath(window.location.pathname);

  if (pathLocale) {
    return pathLocale;
  }

  const savedLocale = window.localStorage.getItem(
    SOVIA_TEST_LOCALE_STORAGE_KEY,
  );

  if (savedLocale) {
    const matchedSavedLocale = matchSoviaTestLocale(savedLocale);

    if (matchedSavedLocale) {
      return matchedSavedLocale;
    }
  }

  for (const language of window.navigator.languages) {
    const matchedLocale = matchSoviaTestLocale(language);

    if (matchedLocale) {
      return matchedLocale;
    }
  }

  return DEFAULT_SOVIA_TEST_LOCALE;
}

export function getSoviaTestLocales() {
  return SOVIA_TEST_LOCALES;
}

export function useSoviaTestI18n(initialLocale?: SoviaTestLocale) {
  const [locale, setLocaleState] = useState<SoviaTestLocale>(() =>
    detectBrowserLocale(initialLocale),
  );

  const copy = useMemo(() => getSoviaTestCopy(locale), [locale]);

  function setLocale(nextLocale: SoviaTestLocale) {
    window.localStorage.setItem(SOVIA_TEST_LOCALE_STORAGE_KEY, nextLocale);
    // biome-ignore lint/suspicious/noDocumentCookie: Middleware reads this lightweight test-language preference cookie.
    document.cookie = `${SOVIA_TEST_LOCALE_STORAGE_KEY}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`;
    const url = new URL(window.location.href);
    const pathWithoutLocale = stripSoviaTestLocaleFromPath(url.pathname);

    url.pathname = getSoviaTestLocalizedPath(pathWithoutLocale, nextLocale);
    url.searchParams.delete("lang");

    window.history.replaceState(null, "", url);
    setLocaleState(nextLocale);
  }

  return {
    copy,
    locale,
    locales: SOVIA_TEST_LOCALES,
    setLocale,
  };
}
