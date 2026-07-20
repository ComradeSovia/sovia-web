import {
  ADMIN_GOOGLE_STATE_COOKIE_NAME,
  createGoogleOAuthState,
  getAdminAuthStatus,
  getGoogleAdminConfig,
  getGoogleOAuthStateCookieOptions,
} from "@sovia/admin/data/auth";
import { getGoogleAdminRedirectUri } from "@sovia/admin/data/google-oauth";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  authUrl.searchParams.set("redirect_uri", getGoogleAdminRedirectUri(request));
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
