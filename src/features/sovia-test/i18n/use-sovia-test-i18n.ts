"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SOVIA_TEST_LOCALE,
  SOVIA_TEST_LOCALE_STORAGE_KEY,
  SOVIA_TEST_LOCALES,
  type SoviaTestLocale,
} from "./config";
import { getSoviaTestCopy } from "./copy";

function normalizeLocale(value: string) {
  return value.trim().replaceAll("_", "-");
}

function matchLocale(value: string) {
  const normalizedLocale = normalizeLocale(value);
  const exactLocale = SOVIA_TEST_LOCALES.find(
    (locale) => locale.toLowerCase() === normalizedLocale.toLowerCase(),
  );

  if (exactLocale) {
    return exactLocale;
  }

  const language = normalizedLocale.split("-")[0]?.toLowerCase();
  return SOVIA_TEST_LOCALES.find(
    (locale) => locale.split("-")[0]?.toLowerCase() === language,
  );
}

function detectBrowserLocale() {
  if (typeof window === "undefined") {
    return DEFAULT_SOVIA_TEST_LOCALE;
  }

  const savedLocale = window.localStorage.getItem(
    SOVIA_TEST_LOCALE_STORAGE_KEY,
  );

  if (savedLocale) {
    const matchedSavedLocale = matchLocale(savedLocale);

    if (matchedSavedLocale) {
      return matchedSavedLocale;
    }
  }

  for (const language of window.navigator.languages) {
    const matchedLocale = matchLocale(language);

    if (matchedLocale) {
      return matchedLocale;
    }
  }

  return DEFAULT_SOVIA_TEST_LOCALE;
}

export function getSoviaTestLocales() {
  return SOVIA_TEST_LOCALES;
}

export function useSoviaTestI18n() {
  const [locale, setLocaleState] =
    useState<SoviaTestLocale>(detectBrowserLocale);

  const copy = useMemo(() => getSoviaTestCopy(locale), [locale]);

  function setLocale(nextLocale: SoviaTestLocale) {
    window.localStorage.setItem(SOVIA_TEST_LOCALE_STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
  }

  return {
    copy,
    locale,
    locales: SOVIA_TEST_LOCALES,
    setLocale,
  };
}
