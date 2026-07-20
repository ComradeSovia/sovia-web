import { getGptAnalyticsWork } from "@sovia/admin/data/gpt-analytics";
import { NextResponse } from "next/server";
import { jsonResponse, requireGptPluginAuth } from "../../../_shared";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireGptPluginAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const work = await getGptAnalyticsWork(decodeURIComponent(id));
  if (!work) {
    return NextResponse.json({ message: "Work not found." }, { status: 404 });
  }

  return jsonResponse(work);
}
