import {
  ArrowUpRight,
  CheckCheck,
  Inbox,
  MessageSquare,
  Music2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { planningPrisma } from "../data/song-requests";
import styles from "./planning-workspace.module.css";

export { ReviewDetails } from "./review-details";

type Area = "requests" | "planning-drafts" | "comment-reviews" | "todo";
const areas = [
  { key: "requests", label: "Recommendations", icon: Inbox },
  { key: "planning-drafts", label: "Planning drafts", icon: Sparkles },
  { key: "comment-reviews", label: "Comment reviews", icon: MessageSquare },
  { key: "todo", label: "Production plans", icon: Music2 },
] as const;

export function PlanningNavigation({ active }: { active: Area }) {
  return (
    <nav className={styles.navigation} aria-label="Music workflow">
      <Link href="/admin/review">
        <Inbox size={15} aria-hidden="true" />
        Review inbox
      </Link>
      <Link href="/admin/review/history">Change history</Link>
      {areas.map(({ key, label, icon: Icon }) => (
        <Link
          key={key}
          href={`/admin/${key}`}
          aria-current={active === key ? "page" : undefined}
        >
          <Icon size={15} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ReviewBadge({ value }: { value: string }) {
  const tone = ["ACCEPTED", "APPLIED", "COMPLETED", "Reviewed"].includes(value)
    ? "done"
    : ["REJECTED", "ARCHIVED", "CANCELLED", "Dismissed"].includes(value)
      ? "muted"
      : "pending";
  return (
    <span className={styles.badge} data-tone={tone}>
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export function ProposalPreview({
  title,
  artist,
  notes,
  missing,
}: {
  title: string;
  artist: string | null;
  notes: string | null;
  missing?: string | null;
}) {
  return (
    <div className={styles.preview}>
      <p className={styles.eyebrow}>Saved content preview</p>
      <h3>{title}</h3>
      <p className="text-sm text-zinc-400">{artist || "Unknown artist"}</p>
      <p className="whitespace-pre-wrap text-sm leading-7">
        {notes || "No production direction supplied."}
      </p>
      {missing ? (
        <p className={styles.warning}>Needs confirmation: {missing}</p>
      ) : null}
    </div>
  );
}

export async function PlanningWorkspace({
  active,
  currentId,
  children,
}: {
  active: Area;
  currentId: string;
  children: ReactNode;
}) {
  const db = planningPrisma();
  let items: { id: string; title: string; status: string }[];
  if (active === "requests") {
    items = await db.songRequest.findMany({
      where: { status: { in: ["PENDING", "NEEDS_INFO"] } },
      select: { id: true, title: true, status: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 12,
    });
  } else if (active === "planning-drafts") {
    items = (
      await db.musicPlanningDraft.findMany({
        where: { status: "DRAFT" },
        select: { id: true, sourceName: true, status: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 12,
      })
    ).map((p) => ({ ...p, title: p.sourceName }));
  } else if (active === "comment-reviews") {
    items = (
      await db.commentReview.findMany({
        where: { reviewedAt: null, dismissedAt: null },
        select: {
          id: true,
          sourceText: true,
          comment: { select: { authorDisplayName: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 12,
      })
    ).map((p) => ({
      id: p.id,
      title: `${p.comment.authorDisplayName} · ${p.sourceText.slice(0, 80)}`,
      status: "DRAFT",
    }));
  } else {
    items = await db.adminMusicTodo.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
    });
  }
  return (
    <div className={styles.workspace}>
      <PlanningNavigation active={active} />
      <aside className={styles.queue}>
        <div className={styles.queueHeading}>
          <Inbox size={16} aria-hidden="true" />
          <h2>{active === "todo" ? "In progress" : "To review"}</h2>
        </div>
        <p className="text-xs text-zinc-500">
          {items.length
            ? "Select a record to continue."
            : "The queue is clear."}
        </p>
        {!items.some((item) => item.id === currentId) ? (
          <Link
            className={styles.currentRecord}
            href={`/admin/${active}/${encodeURIComponent(currentId)}`}
            aria-current="page"
          >
            Current record
          </Link>
        ) : null}
        <nav aria-label="Pending records" className={styles.queueItems}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/${active}/${encodeURIComponent(item.id)}`}
              aria-current={item.id === currentId ? "page" : undefined}
            >
              <span className={styles.queueTitle}>{item.title}</span>
              <ReviewBadge value={item.status} />
            </Link>
          ))}
        </nav>
        {!items.length ? (
          <CheckCheck className="my-6 text-zinc-600" aria-hidden="true" />
        ) : null}
        <Link className={styles.allRecords} href={`/admin/${active}`}>
          All records <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
