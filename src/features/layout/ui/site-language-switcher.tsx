"use client";

import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
  SITE_LOCALE_LABELS,
  SITE_LOCALE_STORAGE_KEY,
  SITE_LOCALES,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { Check, ChevronDown, Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LayoutCopy } from "../i18n/copy";

type SiteLanguageSwitcherProps = {
  copy: LayoutCopy;
  initialLocale: SiteLocale;
};

function getInitialLocale(serverLocale: SiteLocale) {
  if (typeof window === "undefined") {
    return serverLocale;
  }

  const savedLocale = window.localStorage.getItem(SITE_LOCALE_STORAGE_KEY);
  const matchedSavedLocale = savedLocale ? matchSiteLocale(savedLocale) : null;

  if (matchedSavedLocale) {
    return matchedSavedLocale;
  }

  if (serverLocale !== DEFAULT_SITE_LOCALE) {
    return serverLocale;
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

export function SiteLanguageSwitcher({
  copy,
  initialLocale: serverLocale,
}: SiteLanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [locale, setLocale] = useState<SiteLocale>(serverLocale);
  const [isOpen, setIsOpen] = useState(false);
  const searchParamsString = searchParams.toString();

  const replaceLocaleUrl = useCallback(
    (nextLocale: SiteLocale) => {
      const nextSearchParams = new URLSearchParams(searchParamsString);
      nextSearchParams.delete("lang");

      const query = nextSearchParams.toString();
      const nextPath = getSiteLocalizedPath(pathname, nextLocale);
      router.replace(query ? `${nextPath}?${query}` : nextPath, {
        scroll: false,
      });
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    const nextLocale = getInitialLocale(serverLocale);
    setLocale(nextLocale);
    writeSiteLocaleCookie(nextLocale);
    if (nextLocale !== serverLocale) {
      replaceLocaleUrl(nextLocale);
      router.refresh();
    }
  }, [serverLocale, router, replaceLocaleUrl]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function updateLocale(nextLocale: SiteLocale) {
    setLocale(nextLocale);
    setIsOpen(false);
    window.localStorage.setItem(SITE_LOCALE_STORAGE_KEY, nextLocale);
    writeSiteLocaleCookie(nextLocale);
    replaceLocaleUrl(nextLocale);
    router.refresh();
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={copy.siteLanguage.label}
        className="grid h-10 min-w-32 grid-cols-[auto_1fr_auto] items-center gap-2 border-2 border-ink bg-paper px-2 text-[10px] font-black uppercase tracking-[0.08em] text-ink shadow-ink transition-colors hover-bg-yellow hover-text-block"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Languages aria-hidden className="h-4 w-4" />
        <span className="truncate text-left">{SITE_LOCALE_LABELS[locale]}</span>
        <ChevronDown
          aria-hidden
          className={[
            "h-4 w-4 transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-12 z-30 w-48 border-2 border-ink bg-paper p-1 text-[10px] font-black uppercase tracking-[0.08em] text-ink shadow-[6px_6px_0_rgb(var(--shadow))]"
          id={menuId}
          role="listbox"
        >
          {SITE_LOCALES.map((availableLocale) => {
            const isSelected = availableLocale === locale;

            return (
              <button
                aria-selected={isSelected}
                className={[
                  "grid w-full grid-cols-[1rem_1fr] items-center gap-2 px-2 py-2 text-left transition-colors",
                  isSelected
                    ? "bg-red text-relief"
                    : "hover-bg-yellow hover-text-block",
                ].join(" ")}
                key={availableLocale}
                onClick={() => updateLocale(availableLocale)}
                role="option"
                type="button"
              >
                <span className="grid place-items-center">
                  {isSelected ? (
                    <Check aria-hidden className="h-3 w-3" />
                  ) : null}
                </span>
                <span>{SITE_LOCALE_LABELS[availableLocale]}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
