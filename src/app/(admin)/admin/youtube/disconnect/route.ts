import { requireAdminSession } from "@sovia/admin/data/auth";
import {
  deleteAdminYoutubeConnection,
  getAdminYoutubeCredentials,
} from "@sovia/admin/data/youtube-connection";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const credentials = await getAdminYoutubeCredentials();
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(credentials.refreshToken)}`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST",
      },
    ).catch(() => undefined);
    await deleteAdminYoutubeConnection();
    const url = new URL("/admin", request.url);
    url.searchParams.set("youtubeStatus", "success");
    url.searchParams.set("youtubeMessage", "YouTube channel disconnected.");
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const url = new URL("/admin", request.url);
    url.searchParams.set("youtubeStatus", "error");
    url.searchParams.set(
      "youtubeMessage",
      error instanceof Error ? error.message : "Disconnect failed.",
    );
    return NextResponse.redirect(url, 303);
  }
}
