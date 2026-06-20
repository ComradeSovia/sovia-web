<div align="center">
  <img src="public/img/sovia-test/banner.jpg" alt="Sovia Test banner" width="100%" />

  <h1>Comrade Sovia</h1>

  <p>
    A Soviet-style anime and game music archive, with lyrics, videos, notes,
    and the Sovia Test personality system.
  </p>

  <p>
    <strong>Next.js 16</strong> · <strong>React 19</strong> ·
    <strong>TypeScript</strong> · <strong>Tailwind CSS v4</strong> ·
    <strong>Prisma</strong>
  </p>
</div>

## Overview

Comrade Sovia is a web archive for Soviet-style anime and game music
adaptations. It collects music works, source links, lyrics, metadata, and
archive notes in a focused Next.js application.

The project also includes **Sovia Test**, a multilingual personality-style
experience with generated result pages and visual identity cards.

This is a personal official website for Comrade Sovia. The repository is shared
for reference and reuse, but it is not packaged as a general-purpose starter
template. Running it in another environment may require local fixes, database
setup, environment variables, or asset adjustments.

<img src="public/img/sovia-test/all_types.jpg" alt="Sovia Test archetype overview" width="100%" />

## Features

- Music archive with detail pages, YouTube thumbnails, lyrics, and metadata.
- Sovia Test flow with multilingual copy and shareable result pages.
- Admin area for managing music archive content.
- App Router based routing, metadata, sitemap, robots, and Open Graph image.
- Prisma-backed data layer with generated typed client code.
- Shared UI foundation using Tailwind CSS, shadcn-style components, and lucide icons.

## Tech Stack

| Layer | Tools |
| --- | --- |
| App | Next.js `16.1.0`, React `19.2.3` |
| Language | TypeScript strict mode |
| Styling | Tailwind CSS v4 |
| Data | Prisma `7.8.0`, PostgreSQL |
| UI | Radix UI primitives, lucide-react, class-variance-authority |
| Quality | Biome `2.2.0` |
| Package manager | pnpm `11.1.3` |

## Getting Started

Install dependencies:

```powershell
pnpm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Generate Prisma client code when needed:

```powershell
pnpm exec prisma generate
```

Start the development server:

```powershell
pnpm dev
```

Then open `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the local Next.js dev server. |
| `pnpm build` | Build the production app. |
| `pnpm start` | Start the production server after building. |
| `pnpm lint` | Run Biome checks. |
| `pnpm lint:fix` | Run Biome checks and apply safe fixes. |
| `pnpm format` | Format files with Biome. |
| `pnpm exec prisma generate` | Regenerate Prisma client code. |
| `pnpm db:push` | Push Prisma schema changes to the database. |

## Project Structure

```text
src/
  app/                 Next.js App Router routes, layouts, API routes
  features/
    admin/             Admin authentication, UI, and actions
    home/              Home page sections
    layout/            Site shell, header, footer, theme UI
    sound/             Music archive data, filtering, pages, UI
    sovia-test/        Test flow, result pages, i18n, archetype logic
  generated/           Prisma generated output
  shared/              Shared config, constants, utilities, UI

prisma/                Prisma schema and migrations
public/                Static assets
data/                  Local data files
scripts/               Helper scripts
```

## Environment

Use `.env.example` as the source of truth for local environment variables.
Do not commit `.env`.

The app expects a PostgreSQL database for Prisma-backed features. Some pages may
render with static or fallback data, but admin and persistence features require
database access.

## Visual Assets

Sovia Test imagery is stored under:

```text
public/img/sovia-test/
```

The README uses:

- `public/img/sovia-test/banner.jpg`
- `public/img/sovia-test/all_types.jpg`

## License

Code in this repository is licensed under the [MIT License](LICENSE).

Image assets are licensed under **CC BY** unless a more specific notice is
provided next to the asset.

You may take and reuse the code. The project itself is maintained for this
specific website, so compatibility with external deployments is not guaranteed.
