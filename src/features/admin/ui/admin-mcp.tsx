import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "../data/auth";
import { getMcpSettings, requireMcpDatabase } from "../data/mcp-settings";
import { revokeMcpKey, saveMcpSettings } from "../mcp-settings-actions";
import { CheckboxField } from "./admin-content";
import { AdminMcpKey } from "./admin-mcp-key";
import {
  AdminConfirmForm,
  AdminDirtyForm,
  AdminSubmitStatusButton,
} from "./admin-step-panels";

export async function AdminMcpPage() {
  await requireAdminSession();
  const settings = await getMcpSettings();
  const logs = await requireMcpDatabase().adminMcpWriteLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      createdAt: true,
      contentId: true,
      actor: true,
      operation: true,
      reason: true,
    },
  });
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">MCP access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect ChatGPT to read and edit song information. Permission changes
          apply to every request, including existing connections.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border p-5">
          <h2 className="mb-4 text-lg font-medium">Permissions</h2>
          <AdminDirtyForm
            key={settings.updatedAt.toISOString()}
            action={saveMcpSettings}
            className="space-y-4"
          >
            <input
              name="version"
              type="hidden"
              value={settings.updatedAt.toISOString()}
            />
            <CheckboxField
              name="enabled"
              label="Enable MCP"
              checked={settings.enabled}
              description="Allow authenticated clients to read the catalogue. Off blocks all MCP tool calls."
            />
            <CheckboxField
              name="allowWrite"
              label="Allow song editing"
              checked={settings.allowWrite}
              description="Create songs and update allowed fields. No record deletion or content ID changes."
            />
            <CheckboxField
              name="allowPublish"
              label="Allow visibility changes"
              checked={settings.allowPublish}
              description="Allow clients with editing permission to publish or hide songs. New songs otherwise remain hidden."
            />
            <CheckboxField
              name="allowSync"
              label="Allow YouTube synchronization"
              checked={settings.allowSync}
              description="Allows sync tools that consume YouTube quota and update local data."
            />
            <CheckboxField
              name="allowOAuth"
              label="Allow OAuth connections"
              checked={settings.allowOAuth}
              description="OAuth tokens also need the corresponding mcp:write or mcp:sync scope."
            />
            <CheckboxField
              name="allowLegacyEnvKey"
              label="Allow environment API key"
              checked={settings.allowLegacyEnvKey}
              description="Accept SOVIA_ADMIN_MCP_API_KEY. Generating or revoking a managed key disables this fallback."
            />
            <AdminSubmitStatusButton
              formAction={saveMcpSettings}
              pendingLabel="Saving…"
              className="rounded-md border px-4 py-2 text-sm"
            >
              Save permissions
            </AdminSubmitStatusButton>
          </AdminDirtyForm>
        </section>
        <section className="space-y-4 rounded-lg border p-5">
          <h2 className="text-lg font-medium">API key</h2>
          <p className="text-sm text-muted-foreground">
            {settings.apiKeyPrefix
              ? `Active managed key: ${settings.apiKeyPrefix}…`
              : "No managed key configured."}{" "}
            Only a SHA-256 hash is stored. All accepted API keys follow the
            permissions on this page.
          </p>
          <AdminMcpKey />
          <AdminConfirmForm
            action={revokeMcpKey}
            message="Revoke the current API key and disable environment-key access? OAuth connections are controlled separately."
          >
            <Button type="submit" variant="destructive">
              Revoke API key access
            </Button>
          </AdminConfirmForm>
          <div className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
            <p>
              Endpoint: <code>/api/admin/mcp</code>
            </p>
            <p>
              API-key clients send{" "}
              <code>Authorization: Bearer YOUR_API_KEY</code>. For OAuth, keep
              the signing secret and Google credentials in the server
              environment.
            </p>
            <p>
              Enable editing here and reconnect OAuth with{" "}
              <code>mcp:read mcp:write</code> to allow ChatGPT to save songs.
              Add <code>mcp:sync</code> only when synchronization is needed.
            </p>
          </div>
        </section>
      </div>
      <section className="rounded-lg border p-5">
        <h2 className="mb-4 text-lg font-medium">Recent song writes</h2>
        {!logs.length ? (
          <p className="text-sm text-muted-foreground">
            No MCP song writes yet.
          </p>
        ) : (
          <ul className="divide-y">
            {logs.map((log) => (
              <li key={log.id} className="space-y-1 py-3 text-sm">
                <Link
                  className="break-words font-medium underline"
                  href={`/admin/mcp/history/${log.id}`}
                >
                  {log.operation} · {log.contentId} ·{" "}
                  {log.createdAt.toISOString()}
                </Link>
                <p className="break-words text-muted-foreground">
                  {log.reason}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {log.actor} · {log.id}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
