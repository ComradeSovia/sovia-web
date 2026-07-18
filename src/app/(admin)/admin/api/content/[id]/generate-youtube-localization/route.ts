import { requireAdminSession } from "@sovia/admin/data/auth";
import { generateYouTubeLocalization } from "@sovia/admin/data/music-description-generator";
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
      locale?: unknown;
      promptKey?: unknown;
    };
    const locale =
      typeof body.locale === "string" && isYoutubeLocale(body.locale)
        ? body.locale
        : null;

    if (!locale) {
      throw new Error("Select a valid primary YouTube language first.");
    }

    const result = await generateYouTubeLocalization({
      contentId: id,
      generationNotes:
        typeof body.generationNotes === "string"
          ? body.generationNotes
          : undefined,
      locale,
      promptKey:
        typeof body.promptKey === "string" ? body.promptKey : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "YouTube localization generation failed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

function isYoutubeLocale(value: string) {
  return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(value);
}
