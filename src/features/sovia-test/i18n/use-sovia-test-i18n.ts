"use client";

import {
  matchSiteLocale,
  SITE_LOCALE_STORAGE_KEY,
} from "@sovia/shared/i18n/site-locale";
import {
  getSiteLocalizedPath,
  stripSiteLocaleFromPath,
} from "@sovia/shared/i18n/site-routing";
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

function getSiteLocaleFromPath(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return firstSegment ? matchSiteLocale(firstSegment) : null;
}

function getSiteLocaleFromCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SITE_LOCALE_STORAGE_KEY}=`));
  const value = cookie?.slice(SITE_LOCALE_STORAGE_KEY.length + 1);

  return value ? matchSiteLocale(decodeURIComponent(value)) : null;
}

function getSavedSiteLocale() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedLocale = window.localStorage.getItem(SITE_LOCALE_STORAGE_KEY);
  return (
    (savedLocale ? matchSiteLocale(savedLocale) : null) ??
    getSiteLocaleFromCookie()
  );
}

export function getSoviaTestClientLocalizedPath(
  pathname: string,
  nextLocale: SoviaTestLocale,
) {
  const siteLocale = getSiteLocaleFromPath(pathname) ?? getSavedSiteLocale();
  const pathWithoutSiteLocale = siteLocale
    ? stripSiteLocaleFromPath(pathname)
    : pathname;
  const pathWithoutTestLocale = stripSoviaTestLocaleFromPath(
    pathWithoutSiteLocale,
  );
  const localizedTestPath = getSoviaTestLocalizedPath(
    pathWithoutTestLocale,
    nextLocale,
  );

  return siteLocale
    ? getSiteLocalizedPath(localizedTestPath, siteLocale)
    : localizedTestPath;
}

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

    url.pathname = getSoviaTestClientLocalizedPath(url.pathname, nextLocale);
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
