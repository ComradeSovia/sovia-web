import {
  ADMIN_GOOGLE_STATE_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  createGoogleAdminSessionCookieValue,
  getAdminAuthStatus,
  getAdminSessionCookieOptions,
  getGoogleAdminConfig,
  getGoogleOAuthStateCookieOptions,
  isMatchingGoogleOAuthState,
} from "@sovia/admin/data/auth";
import { getGoogleAdminRedirectUri } from "@sovia/admin/data/google-oauth";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const ADMIN_GOOGLE_NEXT_COOKIE_NAME = "sovia-admin-google-next";

type EnabledGoogleConfig = Extract<
  ReturnType<typeof getGoogleAdminConfig>,
  { ok: true }
>;

type GoogleTokenResponse = {
  error?: unknown;
  error_description?: unknown;
  id_token?: unknown;
};

type GoogleTokenInfo = {
  aud?: unknown;
  email?: unknown;
  email_verified?: unknown;
  error?: unknown;
  error_description?: unknown;
  exp?: unknown;
  iss?: unknown;
  sub?: unknown;
};

function redirectToAdmin(request: NextRequest, reason?: string) {
  const url = new URL("/admin", request.url);
  if (reason) {
    url.searchParams.set("auth", reason);
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(ADMIN_GOOGLE_STATE_COOKIE_NAME, "", {
    ...getGoogleOAuthStateCookieOptions(),
    maxAge: 0,
  });
  response.cookies.set(ADMIN_GOOGLE_NEXT_COOKIE_NAME, "", {
    ...getGoogleOAuthStateCookieOptions(),
    maxAge: 0,
  });

  return response;
}

function getSafeAdminReturnPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

async function exchangeCodeForIdToken(
  code: string,
  redirectUri: string,
  googleConfig: EnabledGoogleConfig,
) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) return undefined;

  const token = (await response.json()) as GoogleTokenResponse;
  return typeof token.id_token === "string" ? token.id_token : undefined;
}

function isVerifiedEmail(value: unknown) {
  return value === true || value === "true";
}

async function getVerifiedGoogleIdentity(idToken: string, clientId: string) {
  const tokenInfoUrl = new URL(GOOGLE_TOKENINFO_URL);
  tokenInfoUrl.searchParams.set("id_token", idToken);

  const response = await fetch(tokenInfoUrl, { cache: "no-store" });
  if (!response.ok) return undefined;

  const tokenInfo = (await response.json()) as GoogleTokenInfo;
  const issuer = tokenInfo.iss;
  const expiresAt = Number(tokenInfo.exp);

  if (tokenInfo.aud !== clientId) return undefined;
  if (
    issuer !== "https://accounts.google.com" &&
    issuer !== "accounts.google.com"
  ) {
    return undefined;
  }
  if (!isVerifiedEmail(tokenInfo.email_verified)) return undefined;
  if (Number.isFinite(expiresAt) && expiresAt < Math.floor(Date.now() / 1000)) {
    return undefined;
  }
  if (
    typeof tokenInfo.email !== "string" ||
    typeof tokenInfo.sub !== "string"
  ) {
    return undefined;
  }

  return {
    email: tokenInfo.email,
    subject: tokenInfo.sub,
  };
}

export async function GET(request: NextRequest) {
  const authStatus = getAdminAuthStatus();
  if (authStatus.mode !== "google") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const googleConfig = getGoogleAdminConfig();
  if (!googleConfig.ok) {
    return redirectToAdmin(request, "disabled");
  }

  if (request.nextUrl.searchParams.get("error")) {
    return redirectToAdmin(request, "google");
  }

  const state = request.nextUrl.searchParams.get("state") ?? undefined;
  const cookieState = request.cookies.get(
    ADMIN_GOOGLE_STATE_COOKIE_NAME,
  )?.value;
  if (!isMatchingGoogleOAuthState(state, cookieState)) {
    return redirectToAdmin(request, "state");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirectToAdmin(request, "google");
  }

  try {
    const redirectUri = getGoogleAdminRedirectUri(request);
    const idToken = await exchangeCodeForIdToken(
      code,
      redirectUri,
      googleConfig,
    );
    if (!idToken) {
      return redirectToAdmin(request, "google");
    }

    const identity = await getVerifiedGoogleIdentity(
      idToken,
      googleConfig.clientId,
    );
    if (!identity) {
      return redirectToAdmin(request, "google");
    }

    const sessionCookie = createGoogleAdminSessionCookieValue(identity);
    const returnTo = getSafeAdminReturnPath(
      request.cookies.get(ADMIN_GOOGLE_NEXT_COOKIE_NAME)?.value,
    );
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set(
      ADMIN_SESSION_COOKIE_NAME,
      sessionCookie,
      getAdminSessionCookieOptions(),
    );
    response.cookies.set(ADMIN_GOOGLE_STATE_COOKIE_NAME, "", {
      ...getGoogleOAuthStateCookieOptions(),
      maxAge: 0,
    });
    response.cookies.set(ADMIN_GOOGLE_NEXT_COOKIE_NAME, "", {
      ...getGoogleOAuthStateCookieOptions(),
      maxAge: 0,
    });

    return response;
  } catch {
    return redirectToAdmin(request, "google");
  }
}
