import { requireAdminSession } from "@sovia/admin/data/auth";
import { generateVkCopy } from "@sovia/admin/data/music-description-generator";
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
    const result = await generateVkCopy({
      contentId: id,
      generationNotes:
        typeof body.generationNotes === "string"
          ? body.generationNotes
          : undefined,
      promptKey:
        typeof body.promptKey === "string" ? body.promptKey : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "VK copy generation failed.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
