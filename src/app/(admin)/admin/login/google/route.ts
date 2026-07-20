import {
  ADMIN_GOOGLE_STATE_COOKIE_NAME,
  createGoogleOAuthState,
  getAdminAuthStatus,
  getGoogleAdminConfig,
  getGoogleOAuthStateCookieOptions,
} from "@sovia/admin/data/auth";
import { siteUrl } from "@sovia/shared";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getGoogleRedirectUri(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return new URL("/admin/login/google/callback", request.url).toString();
  }

  return siteUrl("/admin/login/google/callback");
}

export async function GET(request: NextRequest) {
  const authStatus = getAdminAuthStatus();
  if (authStatus.mode !== "google") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const googleConfig = getGoogleAdminConfig();
  if (!googleConfig.ok) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const state = createGoogleOAuthState();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", googleConfig.clientId);
  authUrl.searchParams.set("redirect_uri", getGoogleRedirectUri(request));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    ADMIN_GOOGLE_STATE_COOKIE_NAME,
    state,
    getGoogleOAuthStateCookieOptions(),
  );

  return response;
}
