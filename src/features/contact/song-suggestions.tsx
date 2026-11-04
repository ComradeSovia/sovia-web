"use client";

import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SongSuggestions } from "@/features/song-plans/model";
import { songSuggestionQuery } from "@/features/song-plans/suggestion-query";
import { VoteButton, VotingProvider } from "@/features/song-plans/vote-button";
import styles from "./contact.module.css";

export function SongSuggestionMatches({
  title,
  artist,
  locale,
  copy,
  plansCopy,
}: {
  title: string;
  artist: string;
  locale: SiteLocale;
  copy: SharedCopy["contact"]["suggestions"];
  plansCopy: SharedCopy["songPlans"];
}) {
  const query = songSuggestionQuery(title);
  const queryKey = JSON.stringify([query, artist.trim()]);
  const [result, setResult] = useState<{
    key: string;
    data?: SongSuggestions;
    error?: boolean;
  }>({ key: "" });
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/song-plans/suggestions?${new URLSearchParams({ title: query, artist: artist.trim() })}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Suggestions unavailable");
        const data: SongSuggestions = await response.json();
        if (!Array.isArray(data.plans) || !Array.isArray(data.works))
          throw new Error("Invalid suggestions");
        if (!controller.signal.aborted) setResult({ key: queryKey, data });
      } catch {
        if (!controller.signal.aborted)
          setResult({ key: queryKey, error: true });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, artist, queryKey]);
  if (!query)
    return (
      <p className={styles.hint}>
        <Search size={14} aria-hidden="true" />
        {copy.hint}
      </p>
    );
  const current = result.key === queryKey ? result : null;
  return (
    <section
      className={styles.suggestions}
      aria-label={copy.title}
      aria-busy={!current}
    >
      <h2 className={`${styles.heading} flex items-center gap-2 font-bold`}>
        <Search size={17} aria-hidden="true" />
        {copy.title}
      </h2>
      <p className={styles.hint} aria-live="polite">
        {!current
          ? copy.checking
          : current.error
            ? copy.error
            : !current.data?.plans.length && !current.data?.works.length
              ? copy.empty
              : copy.help}
      </p>
      {current?.data ? (
        <VotingProvider>
          {current.data.plans.length ? (
            <div className="space-y-3">
              <h3 className={styles.groupTitle}>{copy.plans}</h3>
              {current.data.plans.map((plan) => (
                <article key={plan.id} className={styles.match}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      className="inline-flex min-w-0 items-center gap-2 break-words font-bold underline underline-offset-4"
                      href={getSiteLocalizedPath(
                        `/song-plans/${encodeURIComponent(plan.id)}`,
                        locale,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {plan.title}
                      <ArrowUpRight
                        size={14}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                    <span className={styles.status}>
                      {plansCopy.status[plan.status]}
                    </span>
                  </div>
                  <p className={styles.hint}>
                    {plan.artist || plansCopy.unknown}
                    {plan.origin ? ` · ${plan.origin}` : ""}
                  </p>
                  <VoteButton
                    id={plan.id}
                    supported={plan.supported}
                    supports={plan.supports}
                    recent={plan.recent}
                    copy={plansCopy}
                  />
                </article>
              ))}
            </div>
          ) : null}
          {current.data.works.length ? (
            <div className="space-y-3">
              <h3 className={styles.groupTitle}>{copy.works}</h3>
              {current.data.works.map((work) => (
                <article key={work.path} className={styles.match}>
                  <Link
                    className="inline-flex items-center gap-2 break-words font-bold underline underline-offset-4"
                    href={getSiteLocalizedPath(
                      `/sound/${encodeURIComponent(work.path)}`,
                      locale,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {work.title}
                    <ArrowUpRight
                      size={14}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                  <p className={styles.hint}>
                    {work.artist || plansCopy.unknown}
                    {work.origin ? ` · ${work.origin}` : ""}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </VotingProvider>
      ) : null}
      <p className={styles.hint}>{copy.different}</p>
    </section>
  );
}
