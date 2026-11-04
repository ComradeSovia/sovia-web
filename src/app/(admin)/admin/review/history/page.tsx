import { AUDIT_TYPES, type AuditType } from "@sovia/admin/data/review-audit";
import { AdminGate } from "@sovia/admin/ui/admin-content";
import { ReviewHistory } from "@sovia/admin/ui/review-history";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review history | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    id?: string;
    page?: string;
    message?: string;
    status?: string;
    event?: string;
  }>;
}) {
  const p = await searchParams;
  const type = AUDIT_TYPES.includes(p.type as AuditType)
    ? (p.type as AuditType)
    : undefined;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(p.page || "1", 10) || 1),
  );
  return (
    <AdminGate returnTo="/admin/review/history">
      <main className="space-y-5">
        <Link href="/admin/review" className="text-sm text-sky-300">
          ← Review inbox
        </Link>
        <h1 className="text-3xl font-semibold">Review history</h1>
        {p.message ? (
          <output
            className={
              p.status === "error" ? "text-amber-200" : "text-emerald-300"
            }
          >
            {p.message}
          </output>
        ) : null}
        <form method="get" className="flex flex-wrap items-end gap-3 text-xs">
          <label className="grid gap-2">
            Record type
            <select
              name="type"
              defaultValue={type || ""}
              className="rounded border border-zinc-700 bg-zinc-950 p-2"
            >
              <option value="">All types</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            Record ID
            <input
              name="id"
              defaultValue={p.id || ""}
              maxLength={300}
              className="rounded border border-zinc-700 bg-zinc-950 p-2"
            />
          </label>
          <button
            type="submit"
            className="rounded border border-zinc-700 px-4 py-2"
          >
            Filter
          </button>
        </form>
        <ReviewHistory type={type} id={p.id} page={page} eventId={p.event} />
      </main>
    </AdminGate>
  );
}
