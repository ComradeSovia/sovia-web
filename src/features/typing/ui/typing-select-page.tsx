"use client";

import type {
  TypingDifficulty,
  TypingLang,
  TypingWorkOption,
} from "@sovia/typing";
import {
  Check,
  Keyboard,
  Languages,
  Music2,
  Search,
  Shuffle,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

const LANG_OPTIONS: TypingLang[] = ["en", "ru", "ru-latin"];
const DIFFICULTY_OPTIONS: TypingDifficulty[] = ["easy", "medium", "hard"];

function canUseLang(work: TypingWorkOption, lang: TypingLang) {
  return lang === "en" ? work.captions.en : work.captions.ru;
}

function getDefaultLangForWork(work: TypingWorkOption): TypingLang {
  return work.captions.en ? "en" : "ru";
}

function getAvailableLangOptions(work: TypingWorkOption): TypingLang[] {
  return LANG_OPTIONS.filter((option) => canUseLang(work, option));
}

function getLangLabel(lang: TypingLang) {
  return lang === "en"
    ? "English"
    : lang === "ru"
      ? "Russian"
      : "Russian Latin";
}

function getLangDescription(lang: TypingLang) {
  return lang === "en"
    ? "Type the English subtitle track."
    : lang === "ru"
      ? "Type with Cyrillic Russian text."
      : "Type Russian subtitles as Latin letters.";
}

function getDifficultyDescription(difficulty: TypingDifficulty) {
  return difficulty === "easy"
    ? "Shorter targets, lighter pace."
    : difficulty === "medium"
      ? "Balanced targets for normal play."
      : "Longer targets for a stricter run.";
}

function getRecommendedWorks(works: TypingWorkOption[], shuffleSeed: string) {
  return [...works]
    .sort(
      (first, second) =>
        getRecommendationScore(first.id, shuffleSeed) -
        getRecommendationScore(second.id, shuffleSeed),
    )
    .slice(0, 6);
}

function getRecommendationScore(value: string, shuffleSeed: string) {
  return Array.from(`${shuffleSeed}:${value}`).reduce(
    (score, char, index) =>
      (score + char.charCodeAt(0) * (index + 29)) % 1_000_003,
    0,
  );
}

export function TypingSelectPage({
  basePath = "/typing",
  difficulty,
  lang,
  searchQuery = "",
  selectedWorkId,
  shuffleSeed = "default",
  works,
}: {
  basePath?: string;
  difficulty: TypingDifficulty;
  lang: TypingLang;
  searchQuery?: string;
  selectedWorkId?: string;
  shuffleSeed?: string;
  works: TypingWorkOption[];
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(searchQuery);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const selectedWork = works.find((work) => work.id === selectedWorkId);
  const activeLang =
    selectedWork && !canUseLang(selectedWork, lang)
      ? getDefaultLangForWork(selectedWork)
      : lang;
  const searchButtonLabel = searchValue.trim() ? "Search" : "Shuffle";
  const matchingWorks = normalizedSearchQuery
    ? works
        .filter((work) =>
          [work.title, work.series, work.id]
            .filter(Boolean)
            .some((value) =>
              value?.toLowerCase().includes(normalizedSearchQuery),
            ),
        )
        .slice(0, 8)
    : getRecommendedWorks(works, shuffleSeed);
  const visibleWorks =
    selectedWork && !matchingWorks.some((work) => work.id === selectedWork.id)
      ? [selectedWork, ...matchingWorks.slice(0, 5)]
      : matchingWorks;

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearchQuery = searchValue.trim();
    router.replace(
      getTypingSelectHref({
        basePath,
        difficulty,
        lang: activeLang,
        searchQuery: nextSearchQuery,
        selectedWorkId: selectedWork?.id,
        shuffleSeed: nextSearchQuery ? undefined : String(Date.now()),
      }),
      { scroll: false },
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <div className="meta flex items-center gap-2">
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Typing game
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="max-w-5xl text-balance">Choose a typing drill</h1>
            <p className="max-w-3xl text-lg">
              Pick a song, choose the game mode, then type with the subtitles.
            </p>
          </div>
          <div className="border-[3px] border-ink bg-yellow p-4 text-block shadow-[6px_6px_0_rgb(var(--shadow))]">
            <div className="text-3xl font-black leading-none">
              {works.length}
            </div>
            <div className="text-xs font-black uppercase tracking-[0.12em]">
              songs ready
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 border-[3px] border-ink bg-paper p-4 shadow-[6px_6px_0_rgb(var(--shadow))] sm:flex-row"
          >
            <label className="sr-only" htmlFor="typing-song-search">
              Search songs
            </label>
            <input
              className="min-h-12 flex-1 border-[3px] border-ink bg-relief px-4 font-black text-block outline-none placeholder:text-ink/50"
              id="typing-song-search"
              name="q"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search song"
              type="search"
              value={searchValue}
            />
            <button className="btn-primary gap-2" type="submit">
              {searchButtonLabel === "Search" ? (
                <Search className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Shuffle className="h-4 w-4" aria-hidden="true" />
              )}
              {searchButtonLabel}
            </button>
          </form>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="meta flex items-center gap-2">
                <Music2 className="h-4 w-4" aria-hidden="true" />
                {normalizedSearchQuery ? "Search results" : "Recommended songs"}
              </div>
              <div className="meta">{visibleWorks.length} shown</div>
            </div>

            <div className="space-y-3">
              {visibleWorks.map((work) => {
                const nextLang = canUseLang(work, activeLang)
                  ? activeLang
                  : getDefaultLangForWork(work);
                const isSelected = work.id === selectedWork?.id;

                return (
                  <Link
                    className={
                      "flex gap-4 border-[3px] border-ink p-3 shadow-[5px_5px_0_rgb(var(--shadow))] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0_rgb(var(--red))] " +
                      (isSelected
                        ? "bg-yellow text-block"
                        : "bg-paper text-ink")
                    }
                    href={getTypingSelectHref({
                      basePath,
                      difficulty,
                      lang: nextLang,
                      searchQuery,
                      selectedWorkId: work.id,
                      shuffleSeed,
                    })}
                    key={work.id}
                    scroll={false}
                  >
                    {/* biome-ignore lint/performance/noImgElement: Thumbnail URLs come from a dynamic local API route with per-video query params. */}
                    <img
                      alt=""
                      className="aspect-video w-28 shrink-0 border-2 border-ink bg-block object-cover sm:w-36"
                      src={`/api/u2b-thumbnail?id=${work.youtubeId}`}
                    />
                    <span className="min-w-0 flex-1 space-y-2">
                      <span className="block truncate text-lg font-black leading-tight">
                        {work.title}
                      </span>
                      <span className="meta flex flex-wrap gap-x-3 gap-y-1">
                        {work.series ? <span>{work.series}</span> : null}
                        <span>#{work.id}</span>
                        {isSelected ? <span>Selected</span> : null}
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <CaptionBadge active={work.captions.en} label="en" />
                        <CaptionBadge active={work.captions.ru} label="ru" />
                        <CaptionBadge
                          active={work.captions.ru}
                          label="ru-latin"
                        />
                      </span>
                    </span>
                  </Link>
                );
              })}

              {visibleWorks.length === 0 ? (
                <div className="border-[3px] border-ink bg-paper p-5 font-black shadow-[5px_5px_0_rgb(var(--shadow))]">
                  No songs found.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="border-[3px] border-ink bg-yellow p-5 text-block shadow-[8px_8px_0_rgb(var(--shadow))]">
            <div className="mb-3 font-black uppercase tracking-[0.12em]">
              Selected song
            </div>
            {selectedWork ? (
              <div className="space-y-4">
                {/* biome-ignore lint/performance/noImgElement: Thumbnail URLs come from a dynamic local API route with per-video query params. */}
                <img
                  alt=""
                  className="aspect-video w-full border-[3px] border-ink bg-block object-cover"
                  src={`/api/u2b-thumbnail?id=${selectedWork.youtubeId}`}
                />
                <div>
                  <div className="text-2xl font-black leading-tight">
                    {selectedWork.title}
                  </div>
                  {selectedWork.series ? (
                    <div className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-red">
                      {selectedWork.series}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="border-[3px] border-ink bg-paper p-4 font-black shadow-[5px_5px_0_rgb(var(--shadow))]">
                Choose a song first.
              </div>
            )}
          </div>

          {selectedWork ? (
            <div className="space-y-5 border-[3px] border-ink bg-paper p-4 shadow-[6px_6px_0_rgb(var(--shadow))]">
              <div className="font-black uppercase tracking-[0.12em] text-red">
                Game mode
              </div>

              <OptionGroup
                icon={<Languages className="h-5 w-5" aria-hidden="true" />}
                label="Typing language"
              >
                {getAvailableLangOptions(selectedWork).map((option) => (
                  <ModeOption
                    description={getLangDescription(option)}
                    href={getTypingSelectHref({
                      basePath,
                      difficulty,
                      lang: option,
                      searchQuery,
                      selectedWorkId: selectedWork.id,
                      shuffleSeed,
                    })}
                    key={option}
                    label={getLangLabel(option)}
                    selected={option === activeLang}
                    value={option}
                  />
                ))}
              </OptionGroup>

              <OptionGroup
                icon={
                  <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                }
                label="Difficulty mode"
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <ModeOption
                    description={getDifficultyDescription(option)}
                    href={getTypingSelectHref({
                      basePath,
                      difficulty: option,
                      lang: activeLang,
                      searchQuery,
                      selectedWorkId: selectedWork?.id,
                      shuffleSeed,
                    })}
                    key={option}
                    label={option}
                    selected={option === difficulty}
                    value={option}
                  />
                ))}
              </OptionGroup>
            </div>
          ) : null}

          {selectedWork ? (
            <Link
              className="btn-primary w-full justify-center"
              href={`${basePath}/${selectedWork.id}?typingLang=${activeLang}&difficulty=${difficulty}`}
            >
              Start game
            </Link>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function getTypingSelectHref({
  basePath,
  difficulty,
  lang,
  searchQuery,
  selectedWorkId,
  shuffleSeed,
}: {
  basePath: string;
  difficulty: TypingDifficulty;
  lang: TypingLang;
  searchQuery?: string;
  selectedWorkId?: string;
  shuffleSeed?: string;
}) {
  const searchParams = new URLSearchParams({
    difficulty,
    typingLang: lang,
  });

  if (searchQuery?.trim()) {
    searchParams.set("q", searchQuery.trim());
  } else if (shuffleSeed?.trim()) {
    searchParams.set("shuffle", shuffleSeed.trim());
  }

  if (selectedWorkId) {
    searchParams.set("videoId", selectedWorkId);
  }

  return `${basePath}?${searchParams.toString()}`;
}

function OptionGroup({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-red">
        {icon}
        {label}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ModeOption({
  description,
  href,
  label,
  selected,
  value,
}: {
  description: string;
  href: string;
  label: string;
  selected: boolean;
  value: string;
}) {
  return (
    <Link
      aria-current={selected ? "true" : undefined}
      className={`flex items-center gap-3 border-[3px] border-ink p-3 shadow-[4px_4px_0_rgb(var(--shadow))] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_rgb(var(--red))] ${
        selected ? "bg-block text-relief" : "bg-relief text-block"
      }`}
      href={href}
      scroll={false}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink ${
          selected ? "bg-yellow text-block" : "bg-paper text-ink"
        }`}
        aria-hidden="true"
      >
        {selected ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-black uppercase tracking-[0.08em]">
            {label}
          </span>
          <span
            className={
              selected
                ? "text-xs font-black uppercase tracking-[0.12em] text-yellow"
                : "meta"
            }
          >
            {selected ? "Selected" : value}
          </span>
        </span>
        <span className="mt-1 block text-sm font-bold leading-snug opacity-80">
          {description}
        </span>
      </span>
    </Link>
  );
}

function CaptionBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`border-2 border-ink px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${
        active ? "bg-yellow text-block" : "bg-paper text-ink opacity-50"
      }`}
    >
      {label}
    </span>
  );
}
