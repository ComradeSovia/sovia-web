import { SONG_PLANS_PATH } from "@sovia/shared/constants/routes";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Disc3,
  ListMusic,
  Search,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { listPublicPlans } from "./data";
import {
  PLAN_SORTS,
  PLAN_TABS,
  type PlanSort,
  type PlanTab,
  type PublicPlan,
} from "./model";
import { SongPlanCard } from "./song-plan-card";
import styles from "./song-plans.module.css";
import { VotingProvider } from "./vote-button";

type Copy = SharedCopy["songPlans"];
const tabIcons = { pool: ListMusic, production: Disc3, completed: Check };
const linkClass =
  "inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4 hover:text-relief";
export function SongPlansPage({
  data,
  locale,
  copy,
  tab,
  sort,
  q,
  page,
}: {
  data: Awaited<ReturnType<typeof listPublicPlans>>;
  locale: SiteLocale;
  copy: Copy;
  tab: PlanTab;
  sort: PlanSort;
  q: string;
  page: number;
}) {
  const base = getSiteLocalizedPath(SONG_PLANS_PATH, locale);
  const href = (next: { tab?: PlanTab; sort?: PlanSort; page?: number }) =>
    `${base}?${new URLSearchParams({ tab: next.tab ?? tab, sort: next.sort ?? sort, q, page: String(next.page ?? 1) })}`;
  return (
    <main
      className={`${styles.page} mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16`}
    >
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden="true" />
            SOVIA / MUSIC STUDIO
          </p>
          <h1 className={`${styles.pageTitle} font-black tracking-tight`}>
            {copy.title}
          </h1>
          <p className={styles.heroIntro}>{copy.intro}</p>
          <div className={styles.heroActions}>
            <Link
              className={styles.suggestButton}
              href={getSiteLocalizedPath("/contact?kind=song", locale)}
            >
              {copy.suggest}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              className={`${linkClass} text-sm`}
              href={getSiteLocalizedPath("/contact", locale)}
            >
              {copy.letter}
            </Link>
          </div>
          <p className={styles.disclaimer}>{copy.disclaimer}</p>
        </div>
        <div className={styles.studioArtwork} aria-hidden="true">
          <span className={styles.artworkLabel}>
            SOVIA
            <br />
            +i
          </span>
          <div className={styles.recordSleeve}>
            <span>+i</span>
          </div>
          <div className={styles.vinyl}>
            <span> S </span>
          </div>
          <span className={styles.artworkFoot}>{copy.title}</span>
        </div>
      </header>
      <nav aria-label={copy.title} className={styles.tabs}>
        {PLAN_TABS.map((value, index) => {
          const Icon = tabIcons[value];
          return (
            <Link
              key={value}
              href={href({ tab: value })}
              aria-current={tab === value ? "page" : undefined}
              className={styles.tab}
            >
              <span className={styles.tabLabel}>
                <span className={styles.tabIndex}>0{index + 1}</span>
                <Icon size={18} aria-hidden="true" />
                {copy[value]}
              </span>
              <span className={styles.tabCount}>{data.counts[value]}</span>
            </Link>
          );
        })}
      </nav>
      <div className={styles.listHeading}>
        <h2>
          {copy[tab]}{" "}
          <span>{new Intl.NumberFormat(locale).format(data.total)}</span>
        </h2>
        <span>
          <TrendingUp size={14} aria-hidden="true" />
          {copy[sort]}
        </span>
      </div>
      <form method="get" action={base} className={styles.filters}>
        <input type="hidden" name="tab" value={tab} />
        <label className="grid min-w-0 flex-1 gap-2 text-xs font-bold">
          {copy.search}
          <span className={styles.searchField}>
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              type="search"
              defaultValue={q}
              maxLength={150}
              placeholder={copy.searchPlaceholder}
              className="min-h-11 w-full min-w-0 border-2 border-ink bg-block px-3 text-sm font-normal"
            />
          </span>
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-bold">
          {copy.sort}
          <select
            name="sort"
            defaultValue={sort}
            className="min-h-11 max-w-full border-2 border-ink bg-block px-3 text-sm font-normal"
          >
            {PLAN_SORTS.map((value) => (
              <option key={value} value={value}>
                {copy[value]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 border-2 border-ink bg-ink px-5 font-bold text-block"
        >
          {copy.filter}
        </button>
      </form>
      <p className={styles.voteNote}>
        <TrendingUp aria-hidden="true" className="mt-1 size-4 shrink-0" />
        {copy.voteNote}
      </p>
      <VotingProvider>
        <div className={styles.songGrid}>
          {data.items.map((plan, index) => (
            <SongPlanCard
              key={plan.id}
              plan={plan}
              locale={locale}
              copy={copy}
              position={index + 1}
            />
          ))}
        </div>
      </VotingProvider>
      {!data.items.length ? (
        <div className={styles.emptyState}>
          <ListMusic size={36} strokeWidth={1} aria-hidden="true" />
          <p>{copy.empty}</p>
          <Link
            className={linkClass}
            href={getSiteLocalizedPath("/contact?kind=song", locale)}
          >
            {copy.suggest}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      <nav
        aria-label={copy.pages}
        className="mt-8 flex flex-wrap items-center justify-between gap-4"
      >
        {page > 1 ? (
          <Link className={linkClass} href={href({ page: page - 1 })}>
            {copy.previous}
          </Link>
        ) : (
          <span />
        )}
        {page > 1 || data.pageCount > 1 ? (
          <span className="text-xs tabular-nums">
            {page} / {data.pageCount}
          </span>
        ) : null}
        {page < data.pageCount ? (
          <Link className={linkClass} href={href({ page: page + 1 })}>
            {copy.next}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}

export function SongPlanDetail({
  plan,
  locale,
  copy,
}: {
  plan: PublicPlan;
  locale: SiteLocale;
  copy: Copy;
}) {
  return (
    <main
      className={`${styles.page} mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-20`}
    >
      <Link
        className={`${linkClass} mb-6 text-sm`}
        href={getSiteLocalizedPath(SONG_PLANS_PATH, locale)}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {copy.back}
      </Link>
      <p className="mb-5 text-xs font-black tracking-widest text-relief">
        {copy.title}
      </p>
      <VotingProvider>
        <SongPlanCard plan={plan} locale={locale} copy={copy} detail />
      </VotingProvider>
      <p className="mt-5 text-xs leading-6 text-relief">
        {copy.disclaimer} {copy.voteNote}
      </p>
    </main>
  );
}
