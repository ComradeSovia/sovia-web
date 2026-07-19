import { requireAdminSession } from "@sovia/admin/data/auth";
import { getAdminMusicWork } from "@sovia/admin/data/music-admin";
import { getAdminYoutubeCredentials } from "@sovia/admin/data/youtube-connection";
import { syncYouTubeCaptions } from "@sovia/youtube-api";
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
      throw new Error("YouTube ID is required before syncing captions.");
    }

    const body = (await request.json()) as {
      confirmHighCost?: unknown;
      tracks?: unknown;
    };
    if (body.confirmHighCost !== true) {
      throw new Error("Confirm the high quota cost before syncing captions.");
    }

    const credentials = await getAdminYoutubeCredentials();
    const result = await syncYouTubeCaptions({
      credentials,
      tracks: getSubtitleTracks(body.tracks),
      videoId: work.u2bId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "YouTube captions sync failed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

function getSubtitleTracks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Subtitle tracks are invalid.");
  }

  return Object.fromEntries(
    Object.entries(value).map(([locale, srt]) => {
      if (typeof srt !== "string" || !srt.trim()) {
        throw new Error(`${locale} subtitle track is empty.`);
      }

      return [locale, srt.trim()];
    }),
  );
}
