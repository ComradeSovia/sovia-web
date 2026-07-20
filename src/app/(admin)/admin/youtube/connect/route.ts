import { randomBytes } from "node:crypto";
import { getAdminUrl } from "@sovia/admin/data/admin-url";
import { requireAdminSession } from "@sovia/admin/data/auth";
import { getYoutubeOAuthConfig } from "@sovia/admin/data/youtube-connection";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YOUTUBE_OAUTH_STATE_COOKIE = "sovia-youtube-oauth-state";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const config = getYoutubeOAuthConfig();
    if (!config.ok) throw new Error(`Missing: ${config.missing.join(", ")}`);

    const state = randomBytes(32).toString("base64url");
    const callbackUrl = getAdminUrl("/admin/youtube/callback", request);
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      [
        "https://www.googleapis.com/auth/youtube.force-ssl",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
        "https://www.googleapis.com/auth/youtube.readonly",
      ].join(" "),
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent select_account");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: 600,
      path: "/admin/youtube",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    const url = getAdminUrl("/admin", request);
    url.searchParams.set(
      "youtube",
      error instanceof Error ? error.message : "YouTube connection failed.",
    );
    return NextResponse.redirect(url);
  }
}
