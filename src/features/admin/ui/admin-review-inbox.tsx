import { ArrowRight, CheckCheck } from "lucide-react";
import Link from "next/link";
import { requireAdminSession } from "../data/auth";
import {
  REVIEW_KINDS,
  REVIEW_LABELS,
  type ReviewKind,
  reviewCounts,
  reviewItems,
} from "../data/review-inbox";
import { AdminGate } from "./admin-content";
import styles from "./planning-workspace.module.css";

export function AdminReviewInboxPage({
  kind,
  page,
  status,
  message,
}: {
  kind?: string;
  page: number;
  status?: string;
  message?: string;
}) {
  return (
    <AdminGate returnTo="/admin/review">
      <ReviewInbox kind={kind} page={page} status={status} message={message} />
    </AdminGate>
  );
}
async function ReviewInbox({
  kind,
  page,
  status,
  message,
}: {
  kind?: string;
  page: number;
  status?: string;
  message?: string;
}) {
  await requireAdminSession();
  const selected = REVIEW_KINDS.includes(kind as ReviewKind)
    ? (kind as ReviewKind)
    : undefined;
  const [counts, groups] = await Promise.all([
    reviewCounts(),
    Promise.all(
      (selected ? [selected] : REVIEW_KINDS).map((k) =>
        reviewItems(k, selected ? (page - 1) * 20 : 0, selected ? 21 : 5),
      ),
    ),
  ]);
  const items = groups
    .flat()
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
  const visible = selected ? items.slice(0, 20) : items;
  return (
    <section className="space-y-6">
      <Link
        href="/admin/review/history"
        className="inline-flex text-sm text-sky-300"
      >
        Review change history →
      </Link>
      <header className="space-y-3">
        <p className={styles.eyebrow}>Music workflow / review inbox</p>
        <h1 className="text-3xl font-semibold">Your next decisions</h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-400">
          Review original recommendations, saved AI drafts and comments in one
          place. Saving edits never approves a proposal. Copied replies remain
          follow-ups until YouTube confirms an owner reply.
        </p>
      </header>
      {message ? (
        <output
          className={status === "error" ? "text-amber-300" : "text-emerald-300"}
        >
          {message}
        </output>
      ) : null}
      <nav className={styles.navigation} aria-label="Review queues">
        <Link
          href="/admin/review"
          aria-current={!selected ? "page" : undefined}
        >
          All queues
        </Link>
        {REVIEW_KINDS.map((k) => (
          <Link
            key={k}
            href={`/admin/review?kind=${k}`}
            aria-current={selected === k ? "page" : undefined}
          >
            {REVIEW_LABELS[k]} <span className="tabular-nums">{counts[k]}</span>
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <p>
          {selected
            ? `${counts[selected]} pending · oldest first`
            : "Up to 5 oldest records per queue. Select a queue to see all records."}
        </p>
        <Link
          className="text-sky-300"
          href="/admin/planning-drafts?action=todo.analyze-proposals"
        >
          Import conversation
        </Link>
      </div>
      <div className="grid gap-3">
        {visible.map((item) => (
          <article key={`${item.kind}-${item.id}`} className={styles.inboxRow}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={styles.eyebrow}>
                {REVIEW_LABELS[item.kind]} ·{" "}
                {item.createdAt.toISOString().slice(0, 10)}
              </span>
              <span className="text-xs text-zinc-400">{item.state}</span>
            </div>
            <Link
              href={item.href}
              className="flex items-start justify-between gap-4 font-semibold text-zinc-100"
            >
              <span className="min-w-0 break-words">{item.title}</span>
              <ArrowRight size={17} className="shrink-0" />
            </Link>
            {item.excerpt ? (
              <p className="line-clamp-2 break-words text-sm leading-6 text-zinc-400">
                {item.excerpt}
              </p>
            ) : null}
            {item.warning ? (
              <p className={styles.warning}>{item.warning}</p>
            ) : null}
          </article>
        ))}
      </div>
      {!visible.length ? (
        <div className="grid justify-items-center gap-3 rounded-lg border border-dashed border-zinc-700 p-12 text-zinc-400">
          <CheckCheck size={28} />
          <p>This queue is clear.</p>
          <Link href="/admin/review" className="text-sm text-sky-300">
            Back to all queues
          </Link>
        </div>
      ) : null}
      {selected ? (
        <nav
          aria-label="Inbox pages"
          className="flex justify-between text-sm text-sky-300"
        >
          {page > 1 ? (
            <Link href={`/admin/review?kind=${selected}&page=${page - 1}`}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          {items.length > 20 ? (
            <Link href={`/admin/review?kind=${selected}&page=${page + 1}`}>
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
