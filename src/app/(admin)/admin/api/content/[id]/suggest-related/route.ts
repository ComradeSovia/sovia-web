import { requireAdminSession } from "@sovia/admin/data/auth";
import { listAdminMusicWorkOptions } from "@sovia/admin/data/music-admin";
import { generateRelatedSuggestions } from "@sovia/admin/data/music-description-generator";
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
    };

    const result = await generateRelatedSuggestions({
      contentId: id,
      generationNotes:
        typeof body.generationNotes === "string"
          ? body.generationNotes
          : undefined,
      promptKey:
        typeof body.promptKey === "string" ? body.promptKey : undefined,
    });
    const workOptions = await listAdminMusicWorkOptions();
    const workByContentId = new Map(
      workOptions.map((work) => [work.contentId, work]),
    );

    return NextResponse.json({
      ...result,
      candidates: result.candidates.map((candidate) => {
        const work = workByContentId.get(candidate.uid);
        return {
          ...candidate,
          path: work?.path ?? null,
          title: work?.title ?? null,
        };
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Related suggestion failed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
