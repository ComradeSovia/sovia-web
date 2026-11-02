# Offline reliability fixes

## Rollout

Apply the checked-in `20261102000000_security_state` migration through the deployment migrator before enabling the application. It adds one table/index without rewriting content. No database commands were run during implementation.

Password login, contact/test submissions and OAuth exchange now fail closed when the security-state database is unavailable. Configure a high-entropy `SOVIA_ADMIN_SESSION_SECRET`; changing it invalidates password sessions. The password fallback remains for compatibility.

Confirm GitHub Actions `CRON_SECRET` and `SITE_URL` match production. The new publication workflow refreshes due videos every 15 minutes in batches of 40 and cleans expired security-state rows. Monitor this job.

Existing OAuth connections without S256 PKCE must reconnect. Authorization codes and refresh tokens are consumed once across restarts/replicas; refresh requests require their original client ID.

## Behavior changes

- Existing content IDs cannot be changed. Clearing text/source fields now persists.
- `visible=false` music is excluded from public queries, metadata, recommendations and sitemap; admin retains access. Audit intended visibility before rollout because the old catalogue ignored this flag.
- Missing paths fall back to the content ID.
- Pages no longer probe YouTube. Editorially visible videos with unknown status remain listed until a scheduled check confirms unavailability. Temporary failures preserve the previous confirmed state.
- Initial shared limits: contact 100/hour globally; test submissions 1000/hour globally plus 10/visitor/hour; password login 10 attempts/minute globally. Tune against actual traffic. No forwarded IP headers are trusted.
- Application/migrator images are pinned to one commit. Readiness requires HTTP 200 from a database-backed endpoint. Rollback remains manual and requires schema compatibility review.

## Connected-environment verification still required

- Field clearing, ID protection and preservation of associated analytics/comments/todos.
- Hidden works on six locales, direct detail URLs, metadata and sitemap, with admin editing retained.
- Concurrent OAuth redemption across replicas (only one success), expiry, reconnection, unavailable database, limits and cleanup.
- Direct entry and mid-test switching for all 23 test languages, preserving answers, plus lazy-import failures.
- Publication cron, readiness and deployment failure handling.

## Remaining work

Server-side catalogue pagination/search and narrower projections need a separate change preserving existing multilingual fuzzy search. Admin-component decomposition, UI-system consolidation and whole-route locale tests also remain. Refresh-token reuse is rejected but does not yet revoke all descendants in a token family. Automatic rollback needs a migration compatibility policy.
