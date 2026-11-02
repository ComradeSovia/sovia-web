import { requireAdminSession } from "@sovia/admin/data/auth";
import { requireMcpDatabase } from "@sovia/admin/data/mcp-settings";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function McpHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const log = await requireMcpDatabase().adminMcpWriteLog.findUnique({
    where: { id: (await params).id },
  });
  if (!log) notFound();
  return (
    <div className="space-y-5">
      <Link href="/admin/mcp" className="text-sm underline">
        Back to MCP access
      </Link>
      <h1 className="break-words text-2xl font-semibold">
        {log.operation} · {log.contentId}
      </h1>
      <p className="break-words text-sm">{log.reason}</p>
      <p className="break-all text-sm text-muted-foreground">
        {log.createdAt.toISOString()} · {log.actor}
      </p>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        {(["before", "after"] as const).map((side) => (
          <section
            key={side}
            className="min-w-0 space-y-3 rounded-lg border p-4"
          >
            <h2 className="text-lg font-medium">
              {side === "before" ? "Before" : "After"}
            </h2>
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-all text-xs">
              {JSON.stringify(log[side], null, 2)}
            </pre>
          </section>
        ))}
      </div>
    </div>
  );
}
