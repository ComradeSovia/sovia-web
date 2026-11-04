import { requireAdminSession } from "@sovia/admin/data/auth";
import { getApprovedReplyForCopy } from "@sovia/admin/data/comment-reviews";
import { NextResponse } from "next/server";
export const maxDuration = 120;
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  try {
    return NextResponse.json(await getApprovedReplyForCopy((await params).id));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Copy blocked; reply status unknown.",
      },
      { status: 400 },
    );
  }
}
