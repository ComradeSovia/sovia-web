"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SOVIA_TEST_LOCALE_LABELS, type SoviaTestLocale } from "../i18n/config";
import { getSoviaTestClientLocalizedPath } from "../i18n/use-sovia-test-i18n";
import type { SoviaTestCopy } from "../types";

type SoviaTestLanguageSwitcherProps = {
  copy: SoviaTestCopy;
  locale: SoviaTestLocale;
  locales: readonly SoviaTestLocale[];
  onLocaleChange: (locale: SoviaTestLocale) => void;
};

export function SoviaTestLanguageSwitcher({
  copy,
  locale,
  locales,
  onLocaleChange,
}: SoviaTestLanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  function getLocaleHref(nextLocale: SoviaTestLocale) {
    const nextSearchParams = new URLSearchParams(searchParamsString);
    nextSearchParams.delete("lang");

    const query = nextSearchParams.toString();
    const nextPath = getSoviaTestClientLocalizedPath(pathname, nextLocale);

    return query ? `${nextPath}?${query}` : nextPath;
  }

  return (
    <details className="group relative ml-auto w-fit">
      <summary className="grid h-10 min-w-36 cursor-pointer list-none grid-cols-[auto_1fr] items-center gap-2 border-[3px] border-ink bg-paper px-3 text-sm font-black text-ink shadow-[4px_4px_0_rgb(var(--shadow))] transition-colors hover-bg-yellow hover-text-block [&::-webkit-details-marker]:hidden">
        <Languages aria-hidden className="h-4 w-4" />
        <span className="truncate">{SOVIA_TEST_LOCALE_LABELS[locale]}</span>
      </summary>
      <nav
        aria-label={copy.language.label}
        className="absolute right-0 top-12 z-30 grid max-h-80 w-56 gap-1 overflow-y-auto border-[3px] border-ink bg-paper p-1 text-[11px] font-black text-ink shadow-[6px_6px_0_rgb(var(--shadow))]"
      >
        {locales.map((availableLocale) => {
          const isSelected = availableLocale === locale;

          return (
            <Link
              aria-current={isSelected ? "page" : undefined}
              className={[
                "px-3 py-2 transition-colors",
                isSelected
                  ? "bg-red text-relief"
                  : "hover-bg-yellow hover-text-block",
              ].join(" ")}
              href={getLocaleHref(availableLocale)}
              key={availableLocale}
              onClick={() => onLocaleChange(availableLocale)}
            >
              {SOVIA_TEST_LOCALE_LABELS[availableLocale]}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}
