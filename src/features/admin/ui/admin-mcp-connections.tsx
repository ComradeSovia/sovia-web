import Link from "next/link";
import { getAdminRequestOrigin } from "../data/admin-url";
import { requireAuditActor } from "../data/auth";
import { listMcpConnections } from "../data/mcp-oauth";
import { revokeMcpConnectionAction } from "../mcp-connection-actions";

export async function AdminMcpConnections() {
  const actor = await requireAuditActor();
  const connections = await listMcpConnections(actor);
  const endpoint = `${getAdminRequestOrigin()}/api/admin/mcp`;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">MCP connections</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Connect ChatGPT or Codex to review recommendations, drafts and plans.
          Every review write uses a preview and explicit confirmation; source
          records and audit history are retained.
        </p>
      </div>
      <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="font-semibold">Connect or reconnect</h2>
        <p className="text-sm text-amber-200">
          Security upgrade: older MCP credentials no longer work. Reconnect with
          OAuth, review the callback and select permissions. Static API keys now
          allow reading only.
        </p>
        <p className="text-sm text-zinc-400">Server URL</p>
        <code className="block break-all rounded bg-zinc-950 p-3 text-sm">
          {endpoint}
        </code>
        <p className="text-sm text-zinc-400">Codex CLI</p>
        <pre className="overflow-x-auto rounded bg-zinc-950 p-3 text-xs">
          <code>{`codex mcp add sovia --url ${endpoint}\ncodex mcp login sovia --scopes mcp:read,mcp:sync,mcp:draft,mcp:review,mcp:publish,offline_access`}</code>
        </pre>
        <p className="text-sm text-zinc-400">
          Use OAuth / automatic client registration in your application. For
          full review access request mcp:read, mcp:sync, mcp:draft, mcp:review
          and mcp:publish. Request offline_access to stay signed in. You can
          deselect permissions on the consent screen.
        </p>
        <p className="text-sm text-zinc-400">
          After reconnecting, refresh the application tool list. Private
          recommendations, pasted conversations and unpublished work are
          available to authorized read connections. Review what you share.
        </p>
        <Link className="text-sm text-sky-300 underline" href="/admin/review">
          Open review inbox
        </Link>
      </section>
      <section className="space-y-4">
        <h2 className="font-semibold">Your connections</h2>
        {!connections.length && (
          <p className="text-sm text-zinc-400">
            No connections yet. Start sign-in from ChatGPT or Codex.
          </p>
        )}
        {connections.map((connection) => {
          const inactive =
            Boolean(connection.revokedAt) || connection.expiresAt <= new Date();
          return (
            <article
              key={connection.id}
              className="space-y-3 rounded-xl border border-zinc-800 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium">{connection.clientName}</h3>
                <span
                  className={
                    inactive
                      ? "text-sm text-zinc-500"
                      : "text-sm text-emerald-300"
                  }
                >
                  {connection.revokedAt
                    ? "Revoked"
                    : inactive
                      ? "Expired"
                      : "Active"}
                </span>
              </div>
              <p className="break-all text-xs text-zinc-400">
                {connection.redirectUri}
              </p>
              <p className="text-sm text-zinc-300">
                {connection.scopes.join(" · ")}
              </p>
              <p className="text-xs text-zinc-500">
                Created {connection.createdAt.toISOString()} · Expires{" "}
                {connection.expiresAt.toISOString()}
              </p>
              {!inactive && (
                <form
                  action={revokeMcpConnectionAction}
                  className="flex flex-wrap items-center gap-4"
                >
                  <input
                    type="hidden"
                    name="connectionId"
                    value={connection.id}
                  />
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input
                      type="checkbox"
                      name="confirm"
                      value="yes"
                      required
                    />
                    Revoke access and refresh tokens for this connection
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950"
                  >
                    Revoke connection
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
