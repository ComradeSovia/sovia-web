"use client";

import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LocalePanelElement = ReactElement<{
  "data-locale": SiteLocale;
}>;

type AdminLocalePanelsProps = {
  labels: Record<SiteLocale, string>;
  locales: readonly SiteLocale[];
  readyLocales: readonly SiteLocale[];
  children: ReactNode;
};

function getInitialCompareLocale(locales: readonly SiteLocale[]) {
  return locales.find((locale) => locale !== "en-US") ?? locales[0] ?? "en-US";
}

export function AdminLocalePanels({
  children,
  labels,
  locales,
  readyLocales,
}: AdminLocalePanelsProps) {
  const [primaryLocale, setPrimaryLocale] = useState<SiteLocale>("en-US");
  const [compareLocale, setCompareLocale] = useState<SiteLocale>(
    getInitialCompareLocale(locales),
  );
  const readySet = useMemo(() => new Set(readyLocales), [readyLocales]);
  const childArray = useMemo(() => Children.toArray(children), [children]);
  const panels = useMemo(
    () =>
      locales.map((locale) => {
        const panel = childArray.find((child): child is LocalePanelElement =>
          Boolean(
            isValidElement<{ "data-locale": SiteLocale }>(child) &&
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
  const hiddenLocales = locales.filter(
    (locale) => locale !== primaryLocale && locale !== compareLocale,
  );

  return (
    <div className="grid gap-4">
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
        <div>{panelByLocale.get(primaryLocale)}</div>
        {compareLocale !== primaryLocale ? (
          <div>{panelByLocale.get(compareLocale)}</div>
        ) : null}
      </div>

      <div className="hidden">
        {hiddenLocales.map((locale) => (
          <div key={locale}>{panelByLocale.get(locale)}</div>
        ))}
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
  labels: Record<SiteLocale, string>;
  locale: SiteLocale;
  locales: readonly SiteLocale[];
  onChange: (locale: SiteLocale) => void;
  readySet: Set<SiteLocale>;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <Select
        onValueChange={(value) => onChange(value as SiteLocale)}
        value={locale}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((availableLocale) => (
            <SelectItem key={availableLocale} value={availableLocale}>
              {readySet.has(availableLocale) ? "● " : "○ "}
              {availableLocale} · {labels[availableLocale]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
