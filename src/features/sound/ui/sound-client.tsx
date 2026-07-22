"use client";

import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SoundCopy } from "../i18n/copy";
import { filterMusic } from "../lib/filter-music";
import type { MusicWork } from "../model/music";
import { SoundCard } from "./sound-card";

const PAGE_SIZE = 50;
const DEBOUNCE_DELAY = 300; // ms

export function SoundClient({
  copy,
  locale,
  musicWorks,
}: {
  copy: SoundCopy;
  locale: SiteLocale;
  musicWorks: MusicWork[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  // Local input state for debounce
  const [inputValue, setInputValue] = useState(query);

  // Sync input when URL changes (back/forward navigation)
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const filtered = useMemo(() => {
    const matchedWorks = filterMusic(musicWorks, query).filter((work) =>
      Boolean(work.u2bId),
    );
    return query.trim() ? matchedWorks : [...matchedWorks].reverse();
  }, [query, musicWorks]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Debounced URL update
  useEffect(() => {
    if (inputValue === query) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);

      if (inputValue) {
        params.set("q", inputValue);
        params.set("page", "1");
      } else {
        params.delete("q");
        params.set("page", "1");
      }

      const nextSearch = params.toString();

      if (nextSearch !== searchParamsString) {
        router.replace(`?${nextSearch}`, { scroll: false });
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [inputValue, query, router, searchParamsString]);

  function getPageHref(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    const safePage = Math.min(Math.max(1, nextPage), totalPages);

    if (safePage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(safePage));
    }

    const nextSearch = params.toString();
    return nextSearch ? `?${nextSearch}` : "?";
  }

  return (
    <section className="space-y-10">
      <div className="grid gap-5 border-[3px] border-ink bg-paper p-5 shadow-[10px_10px_0_rgb(var(--shadow))] md:grid-cols-[1fr_22rem] md:items-end">
        <h1 className="text-5xl sm:text-6xl">{copy.page.title}</h1>

        <input
          className="w-full border-[3px] border-ink bg-paper px-4 py-3 font-black uppercase tracking-[0.08em] text-ink placeholder:text-[rgb(var(--ink)/0.45)] shadow-[6px_6px_0_rgb(var(--red))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--yellow))]"
          placeholder={copy.search.placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {pageItems.map((work) => (
          <SoundCard copy={copy} key={work.path} locale={locale} work={work} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {page <= 1 ? (
            <span aria-disabled="true" className="btn-outline opacity-50">
              {copy.pagination.previous}
            </span>
          ) : (
            <Link className="btn-outline" href={getPageHref(page - 1)}>
              {copy.pagination.previous}
            </Link>
          )}

          <div className="meta">
            {page} / {totalPages}
          </div>

          {page >= totalPages ? (
            <span aria-disabled="true" className="btn-outline opacity-50">
              {copy.pagination.next}
            </span>
          ) : (
            <Link className="btn-outline" href={getPageHref(page + 1)}>
              {copy.pagination.next}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
