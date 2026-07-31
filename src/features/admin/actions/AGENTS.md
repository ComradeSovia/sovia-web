# Admin Actions

This directory is the single source of truth for reusable admin actions. Add a
new action to `registry.ts`; do not create page-specific action lists or modal
branches for it.

## Contract

- Use a stable, namespaced `id`, such as `content.generate-description`.
- Describe temporary stdin with `inputs`. These are never database form fields.
- Use `type: "content"` for a CID and `type: "prompt"` plus `promptTask` for
  an enabled prompt. Do not replace either with a free-text field.
- Mark shareable, non-sensitive inputs with `url: "sync"`. Use short,
  human-readable `urlKey` values where helpful. Keep secrets, tokens, long JSON,
  subtitles, and generated stdout as `url: "omit"`.
- Use `availability.pageSteps` only for the contextual right-bottom picker.
  `/admin/actions` always presents the entire registry.
- `presentation.type: "standard"` uses the generic stdin/stdout modal. Use
  `confirm`, `wizard`, or `custom` only when the interaction genuinely differs;
  register the matching view in `views.tsx`. Its component must still use the
  shared action run state and callbacks.
- Define the result contract in `output`. AI results default to `preview` and
  require an explicit save operation. Never auto-save generated database data.
- Use `execution.batch` when one logical Action must run several HTTP requests.
  The shared runner owns batching, progress, partial failures, and output
  merging; pages and modal views must not duplicate that orchestration.
- Add `output.applyToForm` when a contextual page action can fill its current
  edit form. The runner must mark those fields modified; the editor decides
  when to save the step to PostgreSQL.
- `after.onCompleted` is for a completed execution; `after.onSaved` is only for
  a successful database write. Failed and cancelled runs have no success effects.

## Runtime Rules

- The URL describes a runnable invocation (`action` plus allowed stdin), not
  stdout, errors, task history, or credentials.
- The shared runner owns `validating`, `running`, `succeeded`, `saving`,
  `saved`, and `failed`. Keep stdin on failure so users can retry.
- API routes remain the authority for permission checks and input validation.
- Page shortcuts only open an action. They must not embed duplicated execution
  logic, persistence rules, or AI prompts.

## Verification

After changing action contracts or UI, run:

```powershell
pnpm exec tsc --noEmit --pretty false
pnpm exec biome check src/features/admin/actions src/features/admin/ui/admin-action-host.tsx src/features/admin/ui/admin-content-action-launcher.tsx
```
