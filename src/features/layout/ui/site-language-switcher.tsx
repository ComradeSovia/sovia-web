"use client";

import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
  SITE_LOCALE_LABELS,
  SITE_LOCALE_STORAGE_KEY,
  SITE_LOCALES,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { useEffect, useState } from "react";
import { getDefaultLayoutCopy } from "../i18n/copy";

const copy = getDefaultLayoutCopy();

function getInitialLocale() {
  if (typeof window === "undefined") {
    return DEFAULT_SITE_LOCALE;
  }

  const savedLocale = window.localStorage.getItem(SITE_LOCALE_STORAGE_KEY);
  const matchedSavedLocale = savedLocale ? matchSiteLocale(savedLocale) : null;

  if (matchedSavedLocale) {
    return matchedSavedLocale;
  }

  for (const language of window.navigator.languages) {
    const matchedLocale = matchSiteLocale(language);

    if (matchedLocale) {
      return matchedLocale;
    }
  }

  return DEFAULT_SITE_LOCALE;
}

function writeSiteLocaleCookie(locale: SiteLocale) {
  // biome-ignore lint/suspicious/noDocumentCookie: This stores only the site UI language preference.
  document.cookie = `${SITE_LOCALE_STORAGE_KEY}=${encodeURIComponent(locale)}; path=/; max-age=31536000; samesite=lax`;
}

export function SiteLanguageSwitcher() {
  const [locale, setLocale] = useState<SiteLocale>(DEFAULT_SITE_LOCALE);

  useEffect(() => {
    const initialLocale = getInitialLocale();
    setLocale(initialLocale);
    writeSiteLocaleCookie(initialLocale);
  }, []);

  function updateLocale(nextLocale: SiteLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem(SITE_LOCALE_STORAGE_KEY, nextLocale);
    writeSiteLocaleCookie(nextLocale);
  }

  return (
    <label className="grid h-10 min-w-24 shrink-0 border-2 border-ink bg-paper px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-ink shadow-ink">
      <span className="sr-only">{copy.siteLanguage.label}</span>
      <select
        aria-label={copy.siteLanguage.label}
        className="h-full bg-transparent font-black uppercase text-ink outline-none"
        onChange={(event) => updateLocale(event.target.value as SiteLocale)}
        value={locale}
      >
        {SITE_LOCALES.map((availableLocale) => (
          <option key={availableLocale} value={availableLocale}>
            {SITE_LOCALE_LABELS[availableLocale]}
          </option>
        ))}
      </select>
    </label>
  );
}
