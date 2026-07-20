import { getAdminUrl } from "@sovia/admin/data/admin-url";
import { requireAdminSession } from "@sovia/admin/data/auth";
import { syncAdminYoutubeAnalytics } from "@sovia/admin/data/youtube-analytics";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = getAdminUrl("/admin/analytics", request);

  try {
    await requireAdminSession();
    const result = await syncAdminYoutubeAnalytics();
    url.searchParams.set("status", "success");
    url.searchParams.set("message", result.message);
  } catch (error) {
    url.searchParams.set("status", "error");
    url.searchParams.set(
      "message",
      error instanceof Error ? error.message : "YouTube Analytics sync failed.",
    );
  }

  return NextResponse.redirect(url, 303);
}
