import { SONG_PLANS_PATH } from "@sovia/shared/constants/routes";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import {
  ArrowUpRight,
  Check,
  Circle,
  Disc3,
  Headphones,
  Pause,
} from "lucide-react";
import Link from "next/link";
import type { PublicPlan } from "./model";
import styles from "./song-plans.module.css";
import { VoteButton } from "./vote-button";

type Copy = SharedCopy["songPlans"];
const linkClass =
  "inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4 hover:text-relief";
export function SongPlanCard({
  plan,
  locale,
  copy,
  detail = false,
  preview = false,
  position,
}: {
  plan: PublicPlan;
  locale: SiteLocale;
  copy: Copy;
  detail?: boolean;
  preview?: boolean;
  position?: number;
}) {
  const Heading = detail ? "h1" : "h3";
  const date = plan.completedAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(plan.completedAt))
    : null;
  return (
    <article
      className={`${styles.songCard} ${detail ? styles.detailCard : ""}`}
      data-status={plan.status}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span className={styles.status}>
          {plan.status === "COMPLETED" ? (
            <Check size={14} aria-hidden="true" />
          ) : plan.status === "IN_PRODUCTION" ? (
            <Disc3 size={14} aria-hidden="true" />
          ) : plan.status === "PAUSED" ? (
            <Pause size={14} aria-hidden="true" />
          ) : (
            <Circle size={12} aria-hidden="true" />
          )}
          {copy.status[plan.status]}
        </span>
        {plan.requestCount ? (
          <span className="text-relief">
            {plan.requestCount} {copy.requests}
          </span>
        ) : null}
      </div>
      <div className={styles.songHeading}>
        <span className={styles.musicMark} aria-hidden="true">
          <span className={styles.miniRecord} />
          {position ? (
            <span className={styles.trackNumber}>
              {String(position).padStart(2, "0")}
            </span>
          ) : null}
        </span>
        <div className="min-w-0">
          <Heading
            className={`${detail ? styles.detailTitle : styles.cardTitle} break-words font-black`}
          >
            {detail || preview ? (
              plan.title
            ) : (
              <Link
                className="hover:underline"
                href={getSiteLocalizedPath(
                  `${SONG_PLANS_PATH}/${encodeURIComponent(plan.id)}`,
                  locale,
                )}
              >
                {plan.title}
              </Link>
            )}
          </Heading>
          <p className={styles.artist}>
            {copy.artist}: {plan.artist || copy.unknown}
          </p>
          {plan.origin ? (
            <p className={styles.origin}>
              {copy.origin}: {plan.origin}
            </p>
          ) : null}
        </div>
      </div>
      <p
        className={`${detail ? "" : styles.summary} whitespace-pre-wrap break-words text-sm leading-7 text-relief`}
      >
        {plan.summary || copy.summaryMissing}
      </p>
      {date ? (
        <p className="text-xs font-bold">
          {copy.completedOn}: {date}
        </p>
      ) : null}
      {detail && plan.reference ? (
        <a
          className={linkClass}
          href={plan.reference}
          target="_blank"
          rel="noreferrer"
        >
          {copy.reference}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      ) : null}
      {plan.works.length ? (
        <div className="space-y-2 border-t border-ink/20 pt-4">
          <p className="text-xs font-bold">{copy.works}</p>
          {plan.works.map((work) => (
            <div className="min-w-0" key={work.path}>
              <Link
                aria-disabled={preview || undefined}
                tabIndex={preview ? -1 : undefined}
                className={`${linkClass} ${preview ? "pointer-events-none" : ""} break-words text-sm`}
                href={getSiteLocalizedPath(
                  `/sound/${encodeURIComponent(work.path)}`,
                  locale,
                )}
              >
                <Headphones aria-hidden="true" className="size-4 shrink-0" />
                <span>{work.title}</span>
              </Link>
              <p className="text-xs text-relief">{copy.match[work.match]}</p>
            </div>
          ))}
        </div>
      ) : plan.status === "COMPLETED" ? (
        <p className="text-sm text-relief">{copy.workUnavailable}</p>
      ) : null}
      <div className={styles.cardSupport}>
        <VoteButton
          id={plan.id}
          supported={plan.supported}
          supports={plan.supports}
          recent={plan.recent}
          copy={copy}
          preview={preview}
        />
      </div>
      {!detail ? (
        <Link
          aria-disabled={preview || undefined}
          tabIndex={preview ? -1 : undefined}
          className={`${styles.detailsLink} ${preview ? "pointer-events-none" : ""} text-xs`}
          href={getSiteLocalizedPath(
            `${SONG_PLANS_PATH}/${encodeURIComponent(plan.id)}`,
            locale,
          )}
        >
          {copy.details}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </article>
  );
}
