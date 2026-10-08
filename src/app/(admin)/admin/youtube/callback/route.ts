import { timingSafeEqual } from "node:crypto";
import { getAdminUrl } from "@sovia/admin/data/admin-url";
import { requireAdminSession } from "@sovia/admin/data/auth";
import {
  getYoutubeOAuthConfig,
  saveAdminYoutubeConnection,
} from "@sovia/admin/data/youtube-connection";
import { createYouTubeAuthorizedFetch } from "@sovia/youtube-api";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YOUTUBE_OAUTH_STATE_COOKIE = "sovia-youtube-oauth-state";

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  refresh_token?: string;
  scope?: string;
};

type ChannelResponse = {
  error?: {
    message?: string;
    errors?: { reason?: string }[];
  };
  items?: { id?: string; snippet?: { title?: string } }[];
};

function statesMatch(left?: string, right?: string) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function redirect(request: NextRequest, status: string, message: string) {
  const url = getAdminUrl("/admin", request);
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
    const callbackUrl = getAdminUrl("/admin/youtube/callback", request);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      cache: "no-store",
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
    const tokens = (await tokenResponse
      .json()
      .catch(() => null)) as TokenResponse | null;
    if (!tokenResponse.ok || !tokens?.access_token) {
      throw new Error(
        `YouTube OAuth code exchange failed (HTTP ${tokenResponse.status}${tokens?.error ? `, ${tokens.error}` : ""}): ${tokens?.error_description || "Google did not return an access token."}`,
      );
    }
    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. Reconnect YouTube and grant offline access.",
      );
    }

    const authorizedFetch = createYouTubeAuthorizedFetch(
      {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: tokens.refresh_token,
      },
      tokens.access_token,
    );
    const channelResponse = await authorizedFetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
    );
    const channels = (await channelResponse
      .json()
      .catch(() => null)) as ChannelResponse | null;
    if (!channelResponse.ok) {
      const reason = channels?.error?.errors?.[0]?.reason;
      throw new Error(
        `YouTube channel lookup failed (HTTP ${channelResponse.status}${reason ? `, ${reason}` : ""}): ${channels?.error?.message || "Google rejected the channel lookup request."}`,
      );
    }
    if (!channels || !Array.isArray(channels.items)) {
      throw new Error("YouTube channel lookup returned an invalid response.");
    }
    const channel = channels.items[0];
    if (!channel) {
      throw new Error(
        "No YouTube channel was found for the authorized account. Reconnect and select the Google account or Brand Account that owns the intended YouTube channel.",
      );
    }
    if (!channel.id || !channel.snippet?.title) {
      throw new Error(
        "YouTube channel lookup returned incomplete channel details.",
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
