import { requireAdminSession } from "@sovia/admin/data/auth";
import { saveCommentBatch } from "@sovia/admin/data/comment-reviews";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
  await requireAdminSession();
  try {
    return NextResponse.json(await saveCommentBatch(await request.json()));
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Review save failed.",
      },
      { status: 400 },
    );
  }
}
