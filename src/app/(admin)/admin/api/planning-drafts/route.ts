import { requireAdminSession } from "@sovia/admin/data/auth";
import { saveNewPlanningDraft } from "@sovia/admin/data/planning-drafts";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await requireAdminSession();
  try {
    return NextResponse.json(await saveNewPlanningDraft(await request.json()));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Draft could not be saved.",
      },
      { status: 400 },
    );
  }
}
