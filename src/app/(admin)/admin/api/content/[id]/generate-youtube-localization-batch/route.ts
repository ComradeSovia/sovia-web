import { requireAdminSession } from "@sovia/admin/data/auth";
import { getAdminMusicWork } from "@sovia/admin/data/music-admin";
import { generateYouTubeLocalizationBatch } from "@sovia/admin/data/music-description-generator";
import { listEnabledAdminYoutubeLocales } from "@sovia/admin/data/youtube-locales";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();

    const { id } = await params;
    const body = (await request.json()) as {
      generationNotes?: unknown;
      promptKey?: unknown;
      sourceLocale?: unknown;
      targetLocales?: unknown;
      youtubeLocalization?: unknown;
    };
    const work = await getAdminMusicWork(id);
    if (!work) throw new Error("Content record could not be loaded.");
    const sourceLocale =
      typeof body.sourceLocale === "string" &&
      isYoutubeLocale(body.sourceLocale)
        ? body.sourceLocale
        : work.youtubePrimaryLocale;
    const requestedTargetLocales = Array.isArray(body.targetLocales)
      ? body.targetLocales.filter(
          (locale): locale is string =>
            typeof locale === "string" && isYoutubeLocale(locale),
        )
      : [];
    const targetLocales = requestedTargetLocales.length
      ? requestedTargetLocales
      : (await listEnabledAdminYoutubeLocales()).map((locale) => locale.locale);
    const requestedLocalization = parseYoutubeLocalization(
      body.youtubeLocalization,
    );
    const youtubeLocalization = Object.keys(requestedLocalization).length
      ? requestedLocalization
      : (work.youtubeLocalization ?? {});

    if (!sourceLocale) {
      throw new Error("Select a valid primary YouTube language first.");
    }

    const result = await generateYouTubeLocalizationBatch({
      contentId: id,
      generationNotes:
        typeof body.generationNotes === "string"
          ? body.generationNotes
          : undefined,
      promptKey:
        typeof body.promptKey === "string" ? body.promptKey : undefined,
      sourceLocale,
      targetLocales,
      youtubeLocalization,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "YouTube localization batch generation failed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

function isYoutubeLocale(value: string) {
  return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(value);
}

function parseYoutubeLocalization(value: unknown) {
  const localization: Record<
    string,
    {
      description?: string | null;
      title?: string | null;
    }
  > = {};

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return localization;
  }

  for (const [locale, content] of Object.entries(value)) {
    if (!isYoutubeLocale(locale)) continue;
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      continue;
    }

    localization[locale] = {
      description:
        typeof content.description === "string" ? content.description : null,
      title: typeof content.title === "string" ? content.title : null,
    };
  }

  return localization;
}
