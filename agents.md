# AGENTS.md

This file is for AI coding agents working in this repository. Its goals are to reduce repeated exploration, avoid excessive verification, and keep implementation style consistent.

## Project Overview

- Project: `sovia-web`
- Framework: Next.js `16.1.0`, React `19.2.3`, TypeScript strict mode
- Package manager: pnpm `11.1.3`
- Styling: Tailwind CSS v4, with global styles in `src/app/globals.css`
- Data layer: Prisma `7.8.0` + PostgreSQL, schema in `prisma/schema.prisma`
- Lint/format: Biome `2.2.0`
- Path aliases: prefer `@sovia/*` and `@/*`; see `tsconfig.json`

## Directory Conventions

- `src/app`: Next App Router routes, layouts, metadata, and API routes.
- `src/features/*`: Business feature modules.
  - `home`: Home page.
  - `layout`: Site layout, navigation, and theme UI.
  - `sound`: Music work list, detail pages, and data loading.
  - `sovia-test`: Test flow, result pages, and i18n copy.
  - `admin`: Admin UI and admin actions.
- `src/shared/*`: Shared UI, config, constants, and utilities used across features.
- `src/generated/*`: Generated Prisma code. Do not edit manually.
- `public/*`: Static assets.
- `data/*`, `scripts/*`: Data files and helper scripts.

## Next.js Routing Notes

- This project uses Next.js `16.1.0`. For request interception, redirects, rewrites, and locale URL normalization, Next 16 expects the `proxy.ts` file convention.
- Because the App Router lives in `src/app`, the active proxy entry must be `src/proxy.ts`. A root-level `proxy.ts` will not be picked up for this project layout.
- Keep shared interception logic in `middleware.ts` only when it is re-exported through `src/proxy.ts`; otherwise direct URL entry may bypass the logic in dev/runtime.
- If locale routing changes, verify both direct browser entry and client-side navigation. In particular, `/test` should normalize to `/{siteLocale}/test/{testLocale}`.

## Implementation Rules

- Prefer the existing module structure and naming. Do not introduce new architecture for small changes.
- Keep page-level code in `src/app`; put reusable business UI and logic in the relevant `src/features/*` module.
- Put code in `src/shared/*` only when it is truly shared across features.
- When adding public exports, prefer updating the relevant feature `index.ts`.
- Use strict TypeScript. Avoid `any`; if a looser type is necessary, keep it local and explain why.
- Prefer existing base UI components:
  - `src/shared/ui/shadcn/*`
  - `src/shared/ui/card.tsx`
  - `src/shared/ui/hammer-star-mark.tsx`
- When using `cn` or `tailwind-merge` helpers, import from the existing shared utilities when available.
- Do not manually edit `src/generated`; run Prisma generation only after schema/client-relevant changes.
- Do not commit `.env` contents. Use `.env.example` as the reference.

## Styling And Frontend Rules

- Preserve the existing visual language: clear, restrained, and content-first.
- Keep Tailwind classes readable; avoid unnecessary complex dynamic class construction.
- Components should behave well responsively, especially on mobile. Avoid text overflow and layout overlap.
- Buttons, forms, navigation, and other interactions should follow the existing component style.
- Important public links that should stay discoverable site-wide can be added to the footer in `src/features/layout/ui/layout-footer.tsx`, preferably using existing route constants and localized labels.
- `lucide-react` is installed; prefer it for common icons.

## Internationalization

- Main site translation files live in:
  - `src/shared/i18n/*.json`
  - `src/features/layout/i18n/*.json`
  - `src/features/home/i18n/*.json`
  - `src/features/sound/i18n/*.json`
  - `src/features/admin/i18n/*.json`
- Main site supported locales are only `en-US`, `ru-RU`, `ja-JP`, `ko-KR`, `zh-CN`, and `zh-TW`; keep `src/shared/i18n/site-locale.ts` aligned with those languages.
- When adding or changing main site copy, update the matching JSON files and the relevant `copy.ts` import/map so the locale is actually loaded.
- Keep JSON key structures consistent across main site language files whenever possible. If a translation is intentionally incomplete, rely on the fallback dictionary merge and mention the gap in the final response.
- Main site language switching uses the `sovia-site-locale` cookie/localStorage key and server-side copy getters. Do not hard-code `getDefault...Copy()` in UI that should react to the selected language; pass localized copy from the route/layout instead.
- `sovia-test` translation files live in `src/features/sovia-test/i18n/*.json`.
- Treat `sovia-test` i18n as independent from the main site i18n. Do not change `src/features/sovia-test/i18n/*` unless the task explicitly targets the test flow.
- When changing test copy, keep key structures consistent across language files whenever possible.
- If all translations cannot be completed, do not break existing keys; mention the remaining translation gap in the final response.

## Data And Prisma

- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations`
- Generated code: `src/generated/prisma`
- Only consider these commands when schema or Prisma-client-related code actually changes:
  - `pnpm exec prisma generate`
  - `pnpm exec prisma migrate ...`
- Database commands may depend on local environment variables. If they fail, explain the failure instead of rerunning blindly.

## Verification Policy

By default, do not run a build or start the dev server for every change. The user will verify manually.

Priority:

1. Small copy, style, route constant, or type-only tweaks: usually run no command; inspect the diff instead.
2. Normal TS/React code changes: prefer small static checks when useful; `pnpm lint` is optional.
3. Prisma schema changes, Next config changes, cross-module refactors, or complex server logic: consider heavier verification.
4. Run `pnpm build` only when the user explicitly asks, the change is high risk, or static inspection is not enough.
5. Run `pnpm dev` only when the user explicitly asks for preview/debugging, or browser behavior must be reproduced.

If build/dev server was not run, briefly say in the final response: "Did not run build/dev server; per this repository's AGENTS guidance, the user will verify manually."

## Token And Command Budget

To save tokens, follow these defaults:

- Before starting a task, read at most 3-6 of the most relevant files; expand only when needed.
- Prefer `rg` / `rg --files` for searching instead of reading files one by one.
- Do not read large generated files, lockfiles, images, or build artifacts unless they are the actual target.
- Do not proactively inspect `.next`, `node_modules`, or `src/generated`.
- Keep progress updates short; report only what is being done and key findings.
- Default to at most 1-2 verification commands. If a command fails, analyze the error before deciding whether to continue.
- Do not install dependencies, start services, browse the network, or run a full build just because it might be useful.

Reasonable exceptions:

- The user explicitly requests full verification, a running server, dependency installation, network lookup, or generated output.
- The change touches security, data loss risk, database migrations, authentication, deployment config, or similarly high-risk areas.
- The available context is insufficient to judge correctness, and skipping additional reading/verification would create obvious rework risk.

## Git And Workspace Safety

- The working tree may already contain user changes. Do not revert or overwrite unconfirmed changes.
- Check scope with `git status --short` before editing.
- Edit only files relevant to the task.
- Do not run destructive commands such as `git reset --hard`, bulk deletion, or forced overwrite unless the user explicitly asks.
- If a commit is requested, confirm the change scope first and use a specific commit message.

## Common Commands

```powershell
pnpm lint
pnpm lint:fix
pnpm format
pnpm exec prisma generate
pnpm build
pnpm dev
```

Use these commands only when necessary by default. In particular, `pnpm build` and `pnpm dev` are not routine verification steps.
