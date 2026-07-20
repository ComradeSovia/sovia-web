import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SITE_NAME } from "@sovia/shared";
import type { NextRequest } from "next/server";
import { getAdminRequestOrigin } from "./admin-url";

const AUTHORIZATION_CODE_TTL_SECONDS = 60 * 10;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const MCP_OAUTH_SCOPE = "mcp:read";

type OAuthTokenKind = "access" | "code" | "refresh";

type SignedOAuthPayload = {
  clientId: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
  issuedAt: number;
  kind: OAuthTokenKind;
  redirectUri?: string;
  scope: string;
  subject: "sovia-admin";
};

type OAuthConfig =
  | {
      ok: true;
      secret: string;
    }
  | {
      missing: string[];
      ok: false;
    };

const usedAuthorizationCodes = new Set<string>();

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getOAuthConfig(): OAuthConfig {
  const secret =
    getOptionalEnv("SOVIA_ADMIN_MCP_OAUTH_SECRET") ||
    getOptionalEnv("SOVIA_ADMIN_SESSION_SECRET") ||
    getOptionalEnv("SOVIA_ADMIN_MCP_API_KEY");

  if (!secret) {
    return {
      missing: [
        "SOVIA_ADMIN_MCP_OAUTH_SECRET, SOVIA_ADMIN_SESSION_SECRET, or SOVIA_ADMIN_MCP_API_KEY",
      ],
      ok: false,
    };
  }

  return { ok: true, secret };
}

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function getRequestOrigin(request: NextRequest) {
  return getAdminRequestOrigin(request);
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function isSameValue(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignedPayload(
  payload: Omit<SignedOAuthPayload, "expiresAt" | "issuedAt">,
  ttlSeconds: number,
  secret: string,
) {
  const issuedAt = getCurrentTimestamp();
  const encodedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      expiresAt: issuedAt + ttlSeconds,
      issuedAt,
    } satisfies SignedOAuthPayload),
  ).toString("base64url");
  const signature = signValue(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

function readSignedPayload(
  value: string,
  expectedKind: OAuthTokenKind,
  secret: string,
) {
  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra !== undefined) return undefined;

  const expectedSignature = signValue(encodedPayload, secret);
  if (!isSameValue(signature, expectedSignature)) return undefined;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SignedOAuthPayload>;

    if (
      payload.kind !== expectedKind ||
      payload.subject !== "sovia-admin" ||
      typeof payload.clientId !== "string" ||
      typeof payload.scope !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < getCurrentTimestamp()
    ) {
      return undefined;
    }

    return payload as SignedOAuthPayload;
  } catch {
    return undefined;
  }
}

function normalizeScope(scope: string | null) {
  const scopes = new Set(
    (scope || MCP_OAUTH_SCOPE)
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
  scopes.add(MCP_OAUTH_SCOPE);
  return Array.from(scopes).join(" ");
}

function isAllowedRedirectUri(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname.startsWith("127."))
    );
  } catch {
    return false;
  }
}

function getCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function isValidCodeVerifier(payload: SignedOAuthPayload, verifier: string) {
  if (!payload.codeChallenge) return true;

  if (payload.codeChallengeMethod === "plain") {
    return isSameValue(payload.codeChallenge, verifier);
  }

  return isSameValue(payload.codeChallenge, getCodeChallenge(verifier));
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

export function getMcpOAuthMetadata(request: NextRequest) {
  const issuer = getRequestOrigin(request);

  return {
    authorization_endpoint: `${issuer}/api/admin/mcp/oauth/authorize`,
    code_challenge_methods_supported: ["S256", "plain"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    issuer,
    response_types_supported: ["code"],
    scopes_supported: [MCP_OAUTH_SCOPE, "offline_access"],
    service_documentation: issuer,
    token_endpoint: `${issuer}/api/admin/mcp/oauth/token`,
    token_endpoint_auth_methods_supported: ["none"],
  };
}

export function getMcpProtectedResourceMetadata(request: NextRequest) {
  const issuer = getRequestOrigin(request);

  return {
    authorization_servers: [issuer],
    resource: `${issuer}/api/admin/mcp`,
    scopes_supported: [MCP_OAUTH_SCOPE, "offline_access"],
  };
}

export function getMcpUnauthorizedHeaders(request: Request) {
  const origin = getAdminRequestOrigin(request);
  return {
    "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
  };
}

export function authorizeMcpOAuthRequest(request: NextRequest) {
  const config = getOAuthConfig();
  if (!config.ok) {
    return jsonResponse(
      {
        error: "server_error",
        error_description: `OAuth signing secret is not configured: ${config.missing.join(", ")}.`,
      },
      { status: 503 },
    );
  }

  const redirectUri = request.nextUrl.searchParams.get("redirect_uri") ?? "";
  if (!isAllowedRedirectUri(redirectUri)) {
    return jsonResponse(
      {
        error: "invalid_request",
        error_description: "redirect_uri must be an HTTPS URL.",
      },
      { status: 400 },
    );
  }

  const clientId =
    request.nextUrl.searchParams.get("client_id") || "chatgpt-mcp";
  const responseType = request.nextUrl.searchParams.get("response_type");
  if (responseType !== "code") {
    return redirectWithOAuthError(
      request,
      redirectUri,
      "unsupported_response_type",
    );
  }

  const codeChallenge =
    request.nextUrl.searchParams.get("code_challenge") ?? undefined;
  const codeChallengeMethod =
    request.nextUrl.searchParams.get("code_challenge_method") ?? undefined;
  if (
    codeChallengeMethod &&
    codeChallengeMethod !== "S256" &&
    codeChallengeMethod !== "plain"
  ) {
    return redirectWithOAuthError(request, redirectUri, "invalid_request");
  }

  const code = createSignedPayload(
    {
      clientId,
      codeChallenge,
      codeChallengeMethod,
      kind: "code",
      redirectUri,
      scope: normalizeScope(request.nextUrl.searchParams.get("scope")),
      subject: "sovia-admin",
    },
    AUTHORIZATION_CODE_TTL_SECONDS,
    config.secret,
  );
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);

  const state = request.nextUrl.searchParams.get("state");
  if (state) {
    url.searchParams.set("state", state);
  }

  return Response.redirect(url);
}

function redirectWithOAuthError(
  request: NextRequest,
  redirectUri: string,
  error: string,
) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);

  const state = request.nextUrl.searchParams.get("state");
  if (state) {
    url.searchParams.set("state", state);
  }

  return Response.redirect(url);
}

export async function handleMcpOAuthTokenRequest(request: NextRequest) {
  const config = getOAuthConfig();
  if (!config.ok) {
    return jsonResponse(
      {
        error: "server_error",
        error_description: `OAuth signing secret is not configured: ${config.missing.join(", ")}.`,
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ error: "invalid_request" }, { status: 400 });
  }

  const grantType = getFormString(formData, "grant_type");
  if (grantType === "authorization_code") {
    return exchangeAuthorizationCode(formData, config.secret);
  }
  if (grantType === "refresh_token") {
    return exchangeRefreshToken(formData, config.secret);
  }

  return jsonResponse({ error: "unsupported_grant_type" }, { status: 400 });
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function exchangeAuthorizationCode(formData: FormData, secret: string) {
  const code = getFormString(formData, "code");
  const payload = readSignedPayload(code, "code", secret);
  if (!payload || usedAuthorizationCodes.has(code)) {
    return jsonResponse({ error: "invalid_grant" }, { status: 400 });
  }

  const redirectUri = getFormString(formData, "redirect_uri");
  if (payload.redirectUri && payload.redirectUri !== redirectUri) {
    return jsonResponse({ error: "invalid_grant" }, { status: 400 });
  }

  const clientId = getFormString(formData, "client_id") || payload.clientId;
  if (payload.clientId !== clientId) {
    return jsonResponse({ error: "invalid_grant" }, { status: 400 });
  }

  const codeVerifier = getFormString(formData, "code_verifier");
  if (payload.codeChallenge && !isValidCodeVerifier(payload, codeVerifier)) {
    return jsonResponse({ error: "invalid_grant" }, { status: 400 });
  }

  usedAuthorizationCodes.add(code);

  return jsonResponse(
    createTokenResponse(payload.clientId, payload.scope, secret),
  );
}

function exchangeRefreshToken(formData: FormData, secret: string) {
  const refreshToken = getFormString(formData, "refresh_token");
  const payload = readSignedPayload(refreshToken, "refresh", secret);
  if (!payload) {
    return jsonResponse({ error: "invalid_grant" }, { status: 400 });
  }

  return jsonResponse(
    createTokenResponse(payload.clientId, payload.scope, secret),
  );
}

function createTokenResponse(clientId: string, scope: string, secret: string) {
  const accessToken = createSignedPayload(
    {
      clientId,
      kind: "access",
      scope,
      subject: "sovia-admin",
    },
    ACCESS_TOKEN_TTL_SECONDS,
    secret,
  );
  const refreshToken = createSignedPayload(
    {
      clientId,
      kind: "refresh",
      scope,
      subject: "sovia-admin",
    },
    REFRESH_TOKEN_TTL_SECONDS,
    secret,
  );

  return {
    access_token: accessToken,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
    token_type: "Bearer",
  };
}

export function isValidMcpOAuthAccessToken(token: string) {
  const config = getOAuthConfig();
  if (!config.ok) return false;

  const payload = readSignedPayload(token, "access", config.secret);
  return payload?.scope.split(/\s+/).includes(MCP_OAUTH_SCOPE) ?? false;
}

export function isMcpOAuthConfigured() {
  return getOAuthConfig().ok;
}

export function getMcpOAuthServerInfo() {
  return {
    name: SITE_NAME,
    scopes: [MCP_OAUTH_SCOPE, "offline_access"],
  };
}
