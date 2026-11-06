import { requireAdminSession } from "@sovia/admin/data/auth";
import { getReviewClient } from "@sovia/admin/data/review-transaction";
import { AdminGate } from "@sovia/admin/ui/admin-content";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function Operation({ id }: { id: string }) {
  await requireAdminSession();
  const db = getReviewClient();
  const operation = await db.mcpReviewOperation.findUnique({ where: { id } });
  if (!operation) notFound();
  const events = await db.reviewAuditEvent.findMany({
    where: { operationId: id },
    orderBy: { createdAt: "asc" },
  });
  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/mcp" className="text-sm text-sky-300">
        ← MCP connections
      </Link>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          MCP review receipt
        </p>
        <h1 className="text-3xl font-semibold">{operation.operation}</h1>
        <p className="break-words text-sm text-zinc-400">
          By {operation.actor}
        </p>
        <p className="text-sm text-zinc-300">
          {operation.committedAt
            ? `Committed ${operation.committedAt.toISOString()}`
            : operation.expiresAt <= new Date()
              ? "Preview expired. Prepare a new preview in your chat."
              : "Awaiting confirmation in your chat. No business changes have been applied."}
        </p>
      </div>
      <section className="space-y-3 rounded-lg border border-zinc-800 p-5">
        <h2 className="font-semibold">Reviewed change and source evidence</h2>
        <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300">
          {JSON.stringify(operation.preview, null, 2)}
        </pre>
      </section>
      {operation.committedAt ? (
        <section className="space-y-3 rounded-lg border border-zinc-800 p-5">
          <h2 className="font-semibold">Saved result</h2>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300">
            {JSON.stringify(operation.result, null, 2)}
          </pre>
          <ul className="space-y-2 text-sm text-sky-300">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/admin/review/history?event=${encodeURIComponent(event.id)}`}
                >
                  {event.action.replaceAll("_", " ")} · {event.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminGate returnTo={`/admin/mcp/operations/${encodeURIComponent(id)}`}>
      <Operation id={id} />
    </AdminGate>
  );
}
