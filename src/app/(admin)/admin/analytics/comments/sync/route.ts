import { getAdminUrl } from "@sovia/admin/data/admin-url";
import { requireAdminSession } from "@sovia/admin/data/auth";
import { syncAdminYoutubeComments } from "@sovia/admin/data/youtube-comments";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = getAdminUrl("/admin/analytics/comments", request);

  try {
    await requireAdminSession();
    const result = await syncAdminYoutubeComments();
    url.searchParams.set("status", "success");
    url.searchParams.set("message", result.message);
  } catch (error) {
    url.searchParams.set("status", "error");
    url.searchParams.set(
      "message",
      error instanceof Error ? error.message : "YouTube comment sync failed.",
    );
  }

  return NextResponse.redirect(url, 303);
}
