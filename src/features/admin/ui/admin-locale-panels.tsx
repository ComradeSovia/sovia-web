"use client";

import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";

type LocalePanelElement = ReactElement<{
  "data-locale": string;
}>;

type AdminLocalePanelsProps = {
  labels: Record<string, string>;
  locales: readonly string[];
  initialPrimaryLocale?: string | null;
  primaryLocaleInputName?: string;
  readyLocales: readonly string[];
  children: ReactNode;
};

function getInitialPrimaryLocale(
  locales: readonly string[],
  preferredLocale?: string | null,
) {
  if (preferredLocale && locales.includes(preferredLocale)) {
    return preferredLocale;
  }
  if (locales.includes("en")) return "en";
  if (locales.includes("en-US")) return "en-US";
  return locales[0] ?? "";
}

function getInitialCompareLocale(
  locales: readonly string[],
  preferredPrimaryLocale?: string | null,
) {
  const primaryLocale = getInitialPrimaryLocale(
    locales,
    preferredPrimaryLocale,
  );
  const preferredCompareLocales = primaryLocale.startsWith("ru")
    ? ["en", "en-US"]
    : ["ru", "ru-RU"];

  for (const locale of preferredCompareLocales) {
    if (primaryLocale !== locale && locales.includes(locale)) return locale;
  }

  return locales.find((locale) => locale !== primaryLocale) ?? primaryLocale;
}

function getStoragePrefix({
  locales,
  primaryLocaleInputName,
}: {
  locales: readonly string[];
  primaryLocaleInputName?: string;
}) {
  return `sovia-admin-locale-panels:${primaryLocaleInputName ?? locales.join(",")}`;
}

function getStoredLocale(key: string, locales: readonly string[]) {
  try {
    const value = window.localStorage.getItem(key);
    return value && locales.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function setStoredLocale(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export function AdminLocalePanels({
  children,
  initialPrimaryLocale,
  labels,
  locales,
  primaryLocaleInputName,
  readyLocales,
}: AdminLocalePanelsProps) {
  const [primaryLocale, setPrimaryLocale] = useState<string>(
    getInitialPrimaryLocale(locales, initialPrimaryLocale),
  );
  const [compareLocale, setCompareLocale] = useState<string>(
    getInitialCompareLocale(locales, initialPrimaryLocale),
  );
  const readySet = useMemo(() => new Set(readyLocales), [readyLocales]);
  const childArray = useMemo(() => Children.toArray(children), [children]);
  const storagePrefix = useMemo(
    () => getStoragePrefix({ locales, primaryLocaleInputName }),
    [locales, primaryLocaleInputName],
  );
  const panels = useMemo(
    () =>
      locales.map((locale) => {
        const panel = childArray.find((child): child is LocalePanelElement =>
          Boolean(
            isValidElement<{ "data-locale": string }>(child) &&
              child.props["data-locale"] === locale,
          ),
        );

        return { locale, panel };
      }),
    [childArray, locales],
  );
  const panelByLocale = useMemo(
    () => new Map(panels.map(({ locale, panel }) => [locale, panel])),
    [panels],
  );

  useEffect(() => {
    if (initialPrimaryLocale) return;

    const storedPrimaryLocale = getStoredLocale(
      `${storagePrefix}:primary`,
      locales,
    );
    const storedCompareLocale = getStoredLocale(
      `${storagePrefix}:compare`,
      locales,
    );

    if (storedPrimaryLocale) {
      setPrimaryLocale(storedPrimaryLocale);
    }
    if (storedCompareLocale) {
      setCompareLocale(storedCompareLocale);
    }
  }, [initialPrimaryLocale, locales, storagePrefix]);

  useEffect(() => {
    if (!initialPrimaryLocale || !locales.includes(initialPrimaryLocale)) {
      return;
    }

    setPrimaryLocale(initialPrimaryLocale);
    setCompareLocale(getInitialCompareLocale(locales, initialPrimaryLocale));
  }, [initialPrimaryLocale, locales]);

  useEffect(() => {
    if (!primaryLocale) return;
    setStoredLocale(`${storagePrefix}:primary`, primaryLocale);
  }, [primaryLocale, storagePrefix]);

  useEffect(() => {
    if (!compareLocale) return;
    setStoredLocale(`${storagePrefix}:compare`, compareLocale);
  }, [compareLocale, storagePrefix]);

  return (
    <div className="grid gap-4">
      {primaryLocaleInputName ? (
        <input
          name={primaryLocaleInputName}
          type="hidden"
          value={primaryLocale}
        />
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <LocaleSelect
          label="Primary language"
          labels={labels}
          locale={primaryLocale}
          locales={locales}
          onChange={setPrimaryLocale}
          readySet={readySet}
        />
        <LocaleSelect
          label="Compare language"
          labels={labels}
          locale={compareLocale}
          locales={locales}
          onChange={setCompareLocale}
          readySet={readySet}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {locales.map((locale) => {
          const ready = readySet.has(locale);
          const active = locale === primaryLocale || locale === compareLocale;

          return (
            <Button
              className={
                ready
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-100"
                  : undefined
              }
              key={locale}
              onClick={() => setCompareLocale(locale)}
              size="sm"
              type="button"
              variant={active ? "secondary" : "outline"}
            >
              {locale}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {locales.map((locale, index) => {
          const visible = locale === primaryLocale || locale === compareLocale;
          const order =
            locale === primaryLocale
              ? 0
              : locale === compareLocale
                ? 1
                : index + 2;

          return (
            <div
              aria-hidden={!visible}
              className={visible ? "block" : "hidden"}
              key={locale}
              style={{ order }}
            >
              {panelByLocale.get(locale)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LocaleSelect({
  label,
  labels,
  locale,
  locales,
  onChange,
  readySet,
}: {
  label: string;
  labels: Record<string, string>;
  locale: string;
  locales: readonly string[];
  onChange: (locale: string) => void;
  readySet: Set<string>;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <select
        className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-sm text-zinc-100 shadow-none outline-none focus-visible:ring-3 focus-visible:ring-zinc-500/50"
        onChange={(event) => onChange(event.target.value)}
        suppressHydrationWarning
        value={locale}
      >
        {locales.map((availableLocale) => (
          <option key={availableLocale} value={availableLocale}>
            {readySet.has(availableLocale) ? "* " : "- "}
            {availableLocale} · {labels[availableLocale] ?? availableLocale}
          </option>
        ))}
      </select>
    </div>
  );
}
