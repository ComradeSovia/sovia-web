import { requireAdminSession } from "@sovia/admin/data/auth";
import { saveAdminActionOutput } from "@sovia/admin/data/music-admin";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

const SAVE_TARGETS = [
  "bilibili",
  "description",
  "pixiv",
  "related",
  "subtitles",
  "vk",
] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = (await request.json()) as {
      action?: unknown;
      output?: unknown;
    };
    if (!SAVE_TARGETS.includes(body.action as (typeof SAVE_TARGETS)[number])) {
      throw new Error("This action output cannot be saved.");
    }

    await saveAdminActionOutput({
      contentId: id,
      output: body.output,
      target: body.action as (typeof SAVE_TARGETS)[number],
    });
    revalidatePath("/admin");
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${encodeURIComponent(id)}`);
    revalidatePath("/sound");

    return NextResponse.json({ message: "Action output saved." });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Saving action output failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
