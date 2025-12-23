"use client";

import { useMemo, useState } from "react";
import { SoundCard } from "@/components/sound-card";
import { filterMusic } from "../../helper/filter-music";
import { MusicWork } from "@/definitions/data-type/music";

const PAGE_SIZE = 50;

export function SoundClient({ musicWorks }: { musicWorks: MusicWork[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return filterMusic(musicWorks, query).filter((m) => m.u2bId);
  }, [query, musicWorks]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="space-y-10">
      <div className="text-center space-y-4">
        <h1>Sound Works</h1>

        <input
          className="mx-auto w-full max-w-xl rounded-xl border border-yellow-300/40 bg-red-950/60 px-4 py-3 text-yellow-100 placeholder-yellow-200/50 focus:outline-none focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/40 "
          placeholder="Search title, series..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
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
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            type="button"
          >
            Prev
          </button>

          <div className="meta">
            {page} / {totalPages}
          </div>

          <button
            className="btn-outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
