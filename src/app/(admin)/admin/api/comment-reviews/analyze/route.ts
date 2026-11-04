import { requireAdminSession } from "@sovia/admin/data/auth";
import { generateCommentBatch } from "@sovia/admin/data/comment-reviews";
import { NextResponse } from "next/server";
import { z } from "zod";
export const maxDuration = 150;
export async function POST(request: Request) {
  await requireAdminSession();
  try {
    const input = z
      .object({
        commentId: z.string().trim().max(300).optional(),
        q: z.string().trim().max(300).optional(),
        limit: z.preprocess(
          (v) => (v === "" || v == null ? 1 : v),
          z.coerce.number().int().min(1).max(5),
        ),
        promptKey: z.string().trim().max(200).optional(),
      })
      .parse(await request.json());
    return NextResponse.json(
      await generateCommentBatch({
        ...input,
        commentId: input.commentId || undefined,
        promptKey: input.promptKey || undefined,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Comment analysis failed.",
      },
      { status: 400 },
    );
  }
}
