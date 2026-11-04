import { requireAdminSession } from "@sovia/admin/data/auth";
import { analyzeTodoProposals } from "@sovia/admin/data/todo-proposal-analyzer";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 150;

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const body = z
      .object({
        promptKey: z.string().max(200).optional(),
        sourceText: z.string().max(40000).optional(),
        sourceName: z.string().max(200).optional(),
        sourceUrl: z.string().max(2000).optional(),
        requestId: z.string().max(300).optional(),
      })
      .parse(await request.json());
    const result = await analyzeTodoProposals({
      promptKey:
        typeof body.promptKey === "string" ? body.promptKey : undefined,
      sourceText: typeof body.sourceText === "string" ? body.sourceText : "",
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      requestId: body.requestId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Proposal analysis failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
