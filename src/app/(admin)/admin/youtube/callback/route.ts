import { timingSafeEqual } from "node:crypto";
import { requireAdminSession } from "@sovia/admin/data/auth";
import {
  getYoutubeOAuthConfig,
  saveAdminYoutubeConnection,
} from "@sovia/admin/data/youtube-connection";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YOUTUBE_OAUTH_STATE_COOKIE = "sovia-youtube-oauth-state";

type TokenResponse = {
  access_token?: string;
  error_description?: string;
  refresh_token?: string;
  scope?: string;
};

type ChannelResponse = {
  items?: { id?: string; snippet?: { title?: string } }[];
};

function statesMatch(left?: string, right?: string) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function redirect(request: NextRequest, status: string, message: string) {
  const url = new URL("/admin", request.url);
  url.searchParams.set("youtubeStatus", status);
  url.searchParams.set("youtubeMessage", message);
  const response = NextResponse.redirect(url);
  response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, "", {
    maxAge: 0,
    path: "/admin/youtube",
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    if (request.nextUrl.searchParams.get("error")) {
      throw new Error("YouTube authorization was cancelled.");
    }
    const state = request.nextUrl.searchParams.get("state") ?? undefined;
    const cookieState = request.cookies.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value;
    if (!statesMatch(state, cookieState))
      throw new Error("Invalid OAuth state.");
    const code = request.nextUrl.searchParams.get("code");
    if (!code) throw new Error("Google did not return an authorization code.");

    const config = getYoutubeOAuthConfig();
    if (!config.ok)
      throw new Error("YouTube OAuth configuration is incomplete.");
    const callbackUrl = new URL("/admin/youtube/callback", request.url);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl.toString(),
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
    const tokens = (await tokenResponse.json()) as TokenResponse;
    if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) {
      throw new Error(
        tokens.error_description || "Google did not return a refresh token.",
      );
    }

    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const channels = (await channelResponse.json()) as ChannelResponse;
    const channel = channels.items?.[0];
    if (!channelResponse.ok || !channel?.id || !channel.snippet?.title) {
      throw new Error(
        "No YouTube channel was found for the authorized account.",
      );
    }

    await saveAdminYoutubeConnection({
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      refreshToken: tokens.refresh_token,
      scopes:
        tokens.scope ??
        [
          "https://www.googleapis.com/auth/youtube.force-ssl",
          "https://www.googleapis.com/auth/yt-analytics.readonly",
          "https://www.googleapis.com/auth/youtube.readonly",
        ].join(" "),
    });
    return redirect(request, "success", `Connected ${channel.snippet.title}.`);
  } catch (error) {
    return redirect(
      request,
      "error",
      error instanceof Error ? error.message : "YouTube connection failed.",
    );
  }
}
