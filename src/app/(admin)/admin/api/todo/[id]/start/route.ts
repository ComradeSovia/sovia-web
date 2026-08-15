import { requireAdminSession } from "@sovia/admin/data/auth";
import { startAdminMusicTodo } from "@sovia/admin/data/music-todos";
import { WORK_TYPES } from "@sovia/admin/validation/music-work-form";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const contentId = getString(body.contentId, 300);
    if (!contentId) throw new Error("Content ID is required.");
    const workType = getString(body.workType, 10);
    if (!WORK_TYPES.includes(workType as (typeof WORK_TYPES)[number])) {
      throw new Error("Work type must be O, CO, R, LC, or C.");
    }

    await startAdminMusicTodo({ contentId, id, workType });
    return NextResponse.json({ contentId });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Todo could not be started.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

function getString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error("Todo input is too long.");
  return normalized;
}
