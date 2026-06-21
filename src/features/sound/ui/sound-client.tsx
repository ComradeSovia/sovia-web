"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getDefaultSoundCopy } from "../i18n/copy";
import { filterMusic } from "../lib/filter-music";
import type { MusicWork } from "../model/music";
import { SoundCard } from "./sound-card";

const PAGE_SIZE = 50;
const DEBOUNCE_DELAY = 300; // ms
const copy = getDefaultSoundCopy();

export function SoundClient({ musicWorks }: { musicWorks: MusicWork[] }) {
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
    return [...filterMusic(musicWorks, query).filter((m) => m.u2bId)].reverse();
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

  function updatePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
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
          <SoundCard key={work.path} work={work} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            className="btn-outline"
            disabled={page <= 1}
            onClick={() => updatePage(page - 1)}
            type="button"
          >
            {copy.pagination.previous}
          </button>

          <div className="meta">
            {page} / {totalPages}
          </div>

          <button
            className="btn-outline"
            disabled={page >= totalPages}
            onClick={() => updatePage(page + 1)}
            type="button"
          >
            {copy.pagination.next}
          </button>
        </div>
      )}
    </section>
  );
}
