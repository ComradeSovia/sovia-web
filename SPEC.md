# Sovia Web Spec

This document records the current product and engineering decisions for the admin content studio, music work data model, and admin authentication. It is meant as a working handoff note for future development.

## Admin Studio Direction

- Admin is an English-only internal content studio.
- The visual direction is dark, neutral, compact, and readable.
- Avoid red/green status colors unless there is a strong semantic need. Prefer zinc/neutral styling.
- Admin navigation should use `next/link` for internal routes.
- The content editor is a stepper-style workflow, inspired by YouTube Studio but not a pixel copy.

Current editor sections:

- `Details`: title, UID/path, content ID, publish date, original-work toggle.
- `Metadata`: music style/type, original/source, inspiration details, series.
- `Description`: default website text only: short description, intro text, production notes.
- `Lyrics`: one default lyrics field.
- `Related`: related content UIDs.
- `Localization`: YouTube-only localization fields.
- `Subtitles`: SRT subtitle text by locale.
- `Distribution`: global platform IDs: YouTube, Bilibili, VK, Pixiv.
- `Review`: simple completeness summary before saving.

## Music Work Content Model

Website-facing music content is not localized per work. The site may have localized UI/routes, but the work's title, metadata text, and lyrics are a single default payload, written primarily in English.

Prisma `MusicWork` currently stores:

- Identity: `path`, `vid`, `title`
- Public metadata: `original`, `series`, `publishedAt`, `isOriginal`
- Music metadata: `musicStyle`, `musicType`, `inspiredByTitle`, `inspiredByAuthor`, `inspiredByDetail`
- Website content: `shortDescription`, `introText`, `productionNotes`, `lyrics`
- Relations: `relatedWorkUids`
- Distribution IDs: `u2bId`, `bilibiliId`, `vkId`, `pixivId`
- YouTube-only localization: `youtubeLocalization Json?`
- SRT subtitles: `subtitleTracks Json?`

Removed/obsolete fields:

- `description`: removed. The old long Markdown description is intentionally not used.
- `localizedContent`: removed. Old per-locale website content is intentionally discarded and must not influence the public site.

JSON shapes:

```ts
type MusicWorkYoutubeLocalization = Partial<
  Record<SiteLocale, { title?: string | null; description?: string | null }>
>;

type MusicWorkSubtitleTracks = Partial<Record<SiteLocale, string>>;
```

`SiteLocale` is the existing site locale set: `en-US`, `zh-CN`, `zh-TW`, `ja-JP`, `ko-KR`, `ru-RU`.

## Frontend Display Rules

- `/sound/[path]` and `/[lang]/sound/[path]` display the same work content.
- Locale-specific routes only localize site chrome/copy, not the work payload.
- Sound detail title uses `work.title`.
- SEO description should prefer `shortDescription`, then `introText`, then `productionNotes`, then generated fallback text.
- YouTube localization must not affect website title, metadata, SEO, or detail page content.
- Legacy `lyrics.md` can still populate `lyrics` for legacy data.
- Legacy `info.md` is not used as public long description.

## Admin Auth

Admin auth mode is selected by env:

- If `SOVIA_ADMIN_PASSWORD` is set and non-empty, use password login.
- If `SOVIA_ADMIN_PASSWORD` is empty or missing, use Google login.
- If neither password nor complete Google config exists, admin is disabled.

Google mode requires:

- `SOVIA_ADMIN_GOOGLE_CLIENT_ID`
- `SOVIA_ADMIN_GOOGLE_CLIENT_SECRET`
- `SOVIA_ADMIN_GOOGLE_EMAIL` or `SOVIA_ADMIN_GOOGLE_SUB`
- `SOVIA_ADMIN_SESSION_SECRET`

Do not expose these through `NEXT_PUBLIC_*`, `next.config.ts env`, or client components. Do not commit `.env`.

Admin includes a fixed left-bottom logout button when an authenticated admin session exists.

## Database And Migration Notes

Relevant migrations:

- `20260628000000_expand_music_work_admin_fields`
- `20260630000000_add_music_work_localized_content`
- `20260701000000_reshape_music_work_content_localization`

The latest reshape migration drops old `description` and `localizedContent`, and adds `youtubeLocalization` and `subtitleTracks`.

Local development database had drift during implementation. `prisma migrate dev` asked for reset, so local DB was synchronized with:

```powershell
pnpm exec prisma db push --accept-data-loss
```

For normal environments, use the migration files rather than relying on `db push`.

After schema changes:

```powershell
pnpm exec prisma generate
pnpm lint
pnpm exec tsc --noEmit
```

## Open Follow-Ups

- Validate the admin editor manually at:
  - `/admin/content`
  - `/admin/content/new`
  - `/admin/content/[id]`
- Validate public sound pages manually at:
  - `/sound/[path]`
  - `/[lang]/sound/[path]`
- Decide later whether YouTube localization should be auto-generated from default website metadata.
- Decide later whether SRT subtitles should support upload/import instead of raw textarea only.
- Consider adding stricter SRT validation before save once the subtitle workflow is stable.
