import { getPrismaClient } from "@sovia/sound/data/prisma";
import Link from "next/link";
import { requireAdminSession } from "../data/auth";
import { markMailboxRead } from "../mailbox-actions";
import { AdminGate } from "./admin-content";
export function AdminMailboxPage({ page }: { page: number }) {
  return (
    <AdminGate returnTo="/admin/mailbox">
      <Mailbox page={page} />
    </AdminGate>
  );
}
async function Mailbox({ page }: { page: number }) {
  await requireAdminSession();
  const prisma = getPrismaClient();
  if (!prisma) return <p>Database unavailable.</p>;
  const messages = await prisma.mailboxMessage.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 30,
    take: 31,
  });
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Mailbox</h1>
        <p className="mt-2 text-zinc-400">Letters from the contact page.</p>
      </div>
      {messages.length === 0 ? (
        <p className="text-zinc-400">No letters yet.</p>
      ) : (
        messages.slice(0, 30).map((message) => (
          <article
            key={message.id}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 break-words text-lg font-semibold">
                {message.subject || "Letter"}
              </h2>
              <span className="text-xs text-zinc-400">
                {message.readAt ? "Read" : "Unread"}
              </span>
            </div>
            <p className="break-words text-sm text-zinc-400">
              {message.name || "Anonymous"}
              {message.email ? ` · ${message.email}` : ""} ·{" "}
              {message.createdAt.toISOString().slice(0, 16).replace("T", " ")}{" "}
              UTC
            </p>
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            {!message.readAt && (
              <form action={markMailboxRead}>
                <input type="hidden" name="id" value={message.id} />
                <button
                  type="submit"
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  Mark as read
                </button>
              </form>
            )}
          </article>
        ))
      )}
      <nav aria-label="Mailbox pages" className="flex gap-6">
        {page > 1 && (
          <Link href={`/admin/mailbox?page=${page - 1}`}>Previous</Link>
        )}
        {messages.length > 30 && (
          <Link href={`/admin/mailbox?page=${page + 1}`}>Next</Link>
        )}
      </nav>
    </section>
  );
}
