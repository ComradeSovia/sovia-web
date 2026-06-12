"use client";

import { SOVIA_TEST_LOCALE_LABELS, type SoviaTestLocale } from "../i18n/config";
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
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <label className="meta" htmlFor="sovia-test-language">
        {copy.language.label}
      </label>
      <select
        className="border-[3px] border-ink bg-paper px-3 py-2 text-sm font-black text-ink shadow-[4px_4px_0_rgb(var(--shadow))]"
        id="sovia-test-language"
        onChange={(event) =>
          onLocaleChange(event.target.value as SoviaTestLocale)
        }
        value={locale}
      >
        {locales.map((availableLocale) => (
          <option key={availableLocale} value={availableLocale}>
            {SOVIA_TEST_LOCALE_LABELS[availableLocale]}
          </option>
        ))}
      </select>
    </div>
  );
}
