import { requireAdminSession } from "@sovia/admin/data/auth";
import { analyzeTodoProposals } from "@sovia/admin/data/todo-proposal-analyzer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const body = (await request.json()) as {
      promptKey?: unknown;
      sourceText?: unknown;
    };
    const result = await analyzeTodoProposals({
      promptKey:
        typeof body.promptKey === "string" ? body.promptKey : undefined,
      sourceText: typeof body.sourceText === "string" ? body.sourceText : "",
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
