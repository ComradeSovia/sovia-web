import { requireAdminSession } from "@sovia/admin/data/auth";
import { generateSubtitleLocalizationBatch } from "@sovia/admin/data/music-description-generator";
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
      subtitleTracks?: unknown;
      targetLocales?: unknown;
    };
    const sourceLocale =
      typeof body.sourceLocale === "string" &&
      isSubtitleLocale(body.sourceLocale)
        ? body.sourceLocale
        : null;
    const targetLocales = Array.isArray(body.targetLocales)
      ? body.targetLocales.filter(
          (locale): locale is string =>
            typeof locale === "string" && isSubtitleLocale(locale),
        )
      : [];

    if (!sourceLocale) {
      throw new Error("Select a valid primary subtitle language first.");
    }

    const result = await generateSubtitleLocalizationBatch({
      contentId: id,
      generationNotes:
        typeof body.generationNotes === "string"
          ? body.generationNotes
          : undefined,
      promptKey:
        typeof body.promptKey === "string" ? body.promptKey : undefined,
      sourceLocale,
      subtitleTracks: parseSubtitleTracks(body.subtitleTracks),
      targetLocales,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Subtitle localization batch generation failed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

function isSubtitleLocale(value: string) {
  return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(value);
}

function parseSubtitleTracks(value: unknown) {
  const tracks: Record<string, string | null> = {};

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return tracks;
  }

  for (const [locale, srt] of Object.entries(value)) {
    if (!isSubtitleLocale(locale)) continue;
    tracks[locale] = typeof srt === "string" ? srt : null;
  }

  return tracks;
}
