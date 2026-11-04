import { ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";
import { requireAdminSession } from "../data/auth";
import {
  REVIEW_KINDS,
  REVIEW_LABELS,
  reviewCounts,
} from "../data/review-inbox";
export async function ReviewOverview() {
  await requireAdminSession();
  const counts = await reviewCounts();
  return (
    <section
      className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
      aria-label="Review overview"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Inbox size={17} />
          Review inbox
        </h2>
        <Link
          className="inline-flex items-center gap-2 text-sm text-sky-300"
          href="/admin/review"
        >
          Open all pending work <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {REVIEW_KINDS.map((kind) => (
          <Link
            key={kind}
            href={`/admin/review?kind=${kind}`}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-600"
          >
            <p className="text-2xl font-semibold tabular-nums">
              {counts[kind]}
            </p>
            <p className="mt-2 text-xs text-zinc-400">{REVIEW_LABELS[kind]}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
