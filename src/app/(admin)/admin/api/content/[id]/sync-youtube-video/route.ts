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
      localizations?: unknown;
      title?: unknown;
    };
    const title = getRequiredString(body.title, "YouTube title");
    const description = getRequiredString(
      body.description,
      "YouTube description",
    );
    const localizations = getLocalizations(body.localizations);

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

function getLocalizations(value: unknown) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("YouTube localizations are invalid.");
  }

  return Object.fromEntries(
    Object.entries(value).map(([locale, content]) => {
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        throw new Error(`YouTube localization ${locale} is invalid.`);
      }
      const localization = content as Record<string, unknown>;
      return [
        locale,
        {
          description: getRequiredString(
            localization.description,
            `${locale} YouTube description`,
          ),
          title: getRequiredString(
            localization.title,
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
