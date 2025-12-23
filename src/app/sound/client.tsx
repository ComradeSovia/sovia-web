"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SoundCard } from "@/components/sound-card";
import type { MusicWork } from "@/definitions/data-type/music";
import { filterMusic } from "../../helper/filter-music";

const PAGE_SIZE = 50;
const DEBOUNCE_DELAY = 300; // ms

export function SoundClient({ musicWorks }: { musicWorks: MusicWork[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  // Local input state for debounce
  const [inputValue, setInputValue] = useState(query);

  // Sync input when URL changes (back/forward navigation)
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const filtered = useMemo(() => {
    return filterMusic(musicWorks, query).filter((m) => m.u2bId);
  }, [query, musicWorks]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Debounced URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (inputValue) {
        params.set("q", inputValue);
        params.set("page", "1");
      } else {
        params.delete("q");
        params.set("page", "1");
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [inputValue, router, searchParams]);

  function updatePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="space-y-10">
      <div className="text-center space-y-4">
        <h1>Sound Works</h1>

        <input
          className="mx-auto w-full max-w-xl rounded-xl border border-yellow-300/40 bg-red-950/60 px-4 py-3 text-yellow-100 placeholder-yellow-200/50 focus:outline-none focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/40"
          placeholder="Search title, series..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {pageItems.map((work) => (
          <SoundCard key={work.vid} work={work} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-4">
          <button
            className="btn-outline"
            disabled={page <= 1}
            onClick={() => updatePage(page - 1)}
            type="button"
          >
            Prev
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
            Next
          </button>
        </div>
      )}
    </section>
  );
}
