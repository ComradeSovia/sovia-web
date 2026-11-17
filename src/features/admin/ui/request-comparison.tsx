"use client";

import { ArrowRight, Columns3, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useContext } from "react";

type Candidate = {
  id: string;
  title: string;
  artist: string | null;
  origin: string | null;
  ideas: string | null;
  channel: string;
  status: string;
  plans: { id: string; title: string; status: string }[];
};
const SelectionContext = createContext<{
  ids: string[];
  toggle: (id: string) => void;
} | null>(null);
const limit = 3;
const link = "text-sky-300 underline-offset-4 hover:underline";

function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export function CompareRequestToggle({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const selection = useContext(SelectionContext);
  if (!selection) return null;
  const checked = selection.ids.includes(id);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <label className="flex min-h-9 items-center gap-2 text-zinc-300 has-disabled:text-zinc-500">
        <input
          type="checkbox"
          checked={checked}
          disabled={!checked && selection.ids.length >= limit}
          onChange={() => selection.toggle(id)}
          aria-label={`Compare ${title}`}
          className="size-4 accent-sky-400"
        />
        Compare
      </label>
      {checked && (
        <a className={link} href="#compare-songs">
          View comparison ↑
        </a>
      )}
    </div>
  );
}

export function RequestComparison({
  candidates,
  children,
}: {
  candidates: Candidate[];
  children: ReactNode;
}) {
  const query = useSearchParams();
  const selected = Array.from(new Set(query.getAll("compare")))
    .flatMap((id) => candidates.find((row) => row.id === id) ?? [])
    .slice(0, limit);
  const ids = selected.map((row) => row.id);
  function setIds(next: string[]) {
    // Preserve this comparison on Back from a review; keep source text out of the URL.
    const url = new URL(window.location.href);
    url.searchParams.delete("compare");
    for (const id of next) url.searchParams.append("compare", id);
    window.history.replaceState(null, "", url);
  }
  function toggle(id: string) {
    if (ids.includes(id)) setIds(ids.filter((item) => item !== id));
    else if (ids.length < limit) setIds([...ids, id]);
  }
  return (
    <SelectionContext.Provider value={{ ids, toggle }}>
      <section
        id="compare-songs"
        aria-labelledby="compare-heading"
        className="scroll-mt-4 space-y-4 rounded-lg border border-zinc-700 bg-zinc-900/60 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="compare-heading"
              className="flex items-center gap-2 font-semibold"
            >
              <Columns3 size={17} aria-hidden="true" /> Compare recommendations
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Choose up to three songs on this page to compare their sources,
              ideas and existing plans.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <output
              aria-live="polite"
              aria-atomic="true"
              className="tabular-nums text-zinc-300"
            >
              {selected.length} of {limit} selected
            </output>
            {selected.length > 0 && (
              <button type="button" className={link} onClick={() => setIds([])}>
                Clear
              </button>
            )}
          </div>
        </div>
        {selected.length > 0 && (
          <div
            className={
              selected.length === 3
                ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                : "grid gap-3 md:grid-cols-2"
            }
          >
            {selected.map((row) => {
              const query = new URLSearchParams({
                candidateTitle: row.title.slice(0, 200),
              });
              if (row.artist) query.set("artist", row.artist.slice(0, 200));
              return (
                <article
                  key={row.id}
                  className="flex min-w-0 flex-col space-y-4 rounded-md border border-zinc-800 bg-zinc-950 p-4"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs capitalize text-zinc-400">
                        {readable(row.channel)} · {readable(row.status)}
                      </p>
                      <h3 className="mt-1 break-words font-semibold text-zinc-100">
                        {row.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${row.title} from comparison`}
                      className="rounded p-1 text-zinc-400 hover:text-white"
                      onClick={() => toggle(row.id)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </header>
                  <dl className="grid gap-3 break-words text-sm">
                    <div>
                      <dt className="text-xs text-zinc-400">Original artist</dt>
                      <dd>{row.artist || "Not supplied"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400">
                        Original work / album / game
                      </dt>
                      <dd>{row.origin || "Not supplied"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400">Adaptation idea</dt>
                      <dd className="max-h-44 overflow-y-auto whitespace-pre-wrap">
                        {row.ideas || "Not supplied"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400">
                        Linked production plans
                      </dt>
                      <dd>
                        {row.plans.length
                          ? row.plans.map((plan) => (
                              <Link
                                key={plan.id}
                                className={`block ${link}`}
                                href={`/admin/todo/${encodeURIComponent(plan.id)}`}
                              >
                                {plan.title} · {readable(plan.status)}
                              </Link>
                            ))
                          : "No linked plan"}
                      </dd>
                    </div>
                  </dl>
                  <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3 text-xs">
                    <Link
                      className={link}
                      prefetch={false}
                      href={`/admin/analytics/strategy?${query}#song-candidate`}
                    >
                      Check catalog &amp; audience fit
                    </Link>
                    <Link
                      className="inline-flex items-center gap-1 font-medium text-zinc-100 hover:underline"
                      href={`/admin/requests/${encodeURIComponent(row.id)}`}
                    >
                      Review this song{" "}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {children}
    </SelectionContext.Provider>
  );
}
