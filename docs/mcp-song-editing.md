# MCP song editing and access management

## Rollout

Apply all checked-in migrations, including `20261102010000_admin_mcp`, before deploying the new app. No connected database checks or migrations were performed during implementation. Missing configuration/tables fail closed. The new migration creates settings and write-history tables and seeds the settings singleton; editing and publishing start disabled.

Open **Admin → Settings → MCP access** (`/admin/mcp`). Enable MCP, enable song editing when desired, and separately enable visibility changes if the assistant should publish/hide songs. Synchronization has an independent switch. Turning off MCP blocks all tool calls; switching off OAuth blocks token issuance and existing OAuth access. Settings are checked on every authenticated request, not cached in the process.

## Credentials

Generate a managed API key in the page or supply a high-entropy custom key. Generated keys are shown once. Only a SHA-256 hash and a short display prefix are persisted. Replacing/revoking a key also disables the environment-key fallback. Keep signing secrets and Google credentials in the server environment; they cannot be retrieved from this page.

Clients use the existing `/api/admin/mcp` endpoint with Bearer authentication. All accepted API keys follow the global switches. OAuth connections additionally require `mcp:read`, `mcp:write` for editing, and `mcp:sync` for synchronization. Older read-only OAuth connections must reconnect with the requested scopes; reconnect/refresh the client tool list after permission changes. Some clients only support OAuth; use the connection method supported by the client.

OAuth requires `SOVIA_ADMIN_MCP_OAUTH_SECRET` or `SOVIA_ADMIN_SESSION_SECRET`. The old API-key fallback for signing is removed so that revoked keys cannot forge OAuth access. Configure an independent signing secret before deploying if your installation relied on that fallback. Never reuse a signing secret as an API key.

## Editing workflow

1. Search for the exact work with existing catalogue tools; confirm its `contentId`.
2. Call `content_get_editable_work` to read allowed fields and `revision`.
3. Review the requested field changes with the user. Save only when instructed.
4. Call `content_update_work` with `contentId`, that `expectedRevision`, a patch containing only changed fields, `confirmWrite: true`, a reason and a fresh UUID `requestId`.
5. Reuse exactly the same input/request ID if retrying after a lost response. A different edit requires a new ID. On a revision conflict, reread and review before trying again.

`content_create_work` requires a new content ID, `patch.songTitle`, `patch.workType`, confirmation, reason and request ID. Check duplicates first. New songs default to hidden. These tools edit local PostgreSQL data; they do not upload, publish or edit videos on external platforms. They cannot delete records, change existing content IDs or manage MCP permissions.

Null clears nullable fields; an empty string clears long text. Omitted fields are preserved. YouTube localization maps merge per locale and field; null removes a locale. Subtitle maps merge per locale; null removes a track. Reserved `__admin` metadata cannot be injected via locale maps. Changing a video ID clears its duration/language metadata unless explicitly supplied. Related IDs must exist and cannot reference the current song.

Writes and before/after history are committed in one serializable transaction. Retried request IDs cannot be reused with different inputs. Admin can inspect the latest writes and their snapshots under MCP access. Snapshots contain song content, so this history stays admin-only. Existing records and history are not automatically pruned.

## Connected-environment acceptance checks

- Confirm default read access, disabled writing, rejected direct write calls and filtered tools/list. Check every permission switch for both API-key and OAuth clients.
- Generate, replace, import and revoke keys; old keys and disabled environment fallback must fail. Reloading must never reveal a saved key.
- Create a hidden song, update lyrics, clear fields, merge one locale and verify untouched content/platform metadata stays intact.
- Change a song concurrently in admin; stale MCP revisions must fail. Concurrent retries should commit once; retrying the winning request returns its audit ID.
- Confirm visibility changes require their own permission; transaction failures must save neither partial changes nor history.
- Verify admin history access, OAuth scopes and token refresh, missing migrations/database outages and mobile layout.
