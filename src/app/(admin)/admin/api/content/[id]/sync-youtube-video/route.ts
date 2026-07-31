import { requireAdminSession } from "@sovia/admin/data/auth";
import { getAdminMusicWork } from "@sovia/admin/data/music-admin";
import { getAdminYoutubeCredentials } from "@sovia/admin/data/youtube-connection";
import { syncYouTubeVideoMetadata } from "@sovia/youtube-api";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();

    const { id } = await params;
    const work = await getAdminMusicWork(id);
    if (!work) {
      throw new Error("Content record could not be loaded.");
    }
    if (!work.u2bId) {
      throw new Error("YouTube ID is required before syncing video metadata.");
    }

    const body = (await request.json()) as {
      description?: unknown;
      locales?: unknown;
      localizations?: unknown;
      primaryLocale?: unknown;
      title?: unknown;
    };
    const primaryLocale =
      typeof body.primaryLocale === "string" && body.primaryLocale
        ? body.primaryLocale
        : work.youtubePrimaryLocale;
    if (!primaryLocale) {
      throw new Error("Select and save a primary YouTube locale first.");
    }
    const primaryLocalization = work.youtubeLocalization?.[primaryLocale];
    const title = getRequiredString(
      body.title ?? primaryLocalization?.title,
      `${primaryLocale} YouTube title`,
    );
    const description = getRequiredString(
      body.description ?? primaryLocalization?.description,
      `${primaryLocale} YouTube description`,
    );
    const localizations = getLocalizations(
      body.locales,
      getLocalizationSource(body.localizations, work.youtubeLocalization),
      primaryLocale,
    );

    const credentials = await getAdminYoutubeCredentials();
    const result = await syncYouTubeVideoMetadata({
      credentials,
      description,
      localizations,
      title,
      videoId: work.u2bId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "YouTube video metadata sync failed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

function getLocalizationSource(
  value: unknown,
  fallback:
    | Record<
        string,
        { description?: string | null; title?: string | null } | undefined
      >
    | null
    | undefined,
) {
  if (value === undefined) return fallback;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("YouTube localizations are invalid.");
  }
  return value as Record<
    string,
    { description?: string | null; title?: string | null } | undefined
  >;
}

function getLocalizations(
  value: unknown,
  available:
    | Record<
        string,
        { description?: string | null; title?: string | null } | undefined
      >
    | null
    | undefined,
  primaryLocale: string,
) {
  if (!Array.isArray(value)) {
    throw new Error("Select at least one YouTube localization to sync.");
  }
  const locales = Array.from(
    new Set(
      value.filter(
        (locale): locale is string =>
          typeof locale === "string" && locale !== primaryLocale,
      ),
    ),
  );
  if (!locales.length) {
    throw new Error(
      "Select at least one locale other than the primary locale.",
    );
  }

  return Object.fromEntries(
    locales.map((locale) => {
      const localization = available?.[locale];
      return [
        locale,
        {
          description: getRequiredString(
            localization?.description,
            `${locale} YouTube description`,
          ),
          title: getRequiredString(
            localization?.title,
            `${locale} YouTube title`,
          ),
        },
      ];
    }),
  );
}

function getRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}
