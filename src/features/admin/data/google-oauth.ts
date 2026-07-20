import { siteUrl } from "@sovia/shared";
import type { NextRequest } from "next/server";

const GOOGLE_ADMIN_CALLBACK_PATH = "/admin/login/google/callback";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}

function getConfiguredOrigin() {
  const rawSiteUrl =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!rawSiteUrl) return undefined;

  try {
    return new URL(rawSiteUrl).origin;
  } catch {
    return undefined;
  }
}

function isUnspecifiedHost(hostname: string) {
  return hostname === "0.0.0.0" || hostname === "::";
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.startsWith("127.") ||
    isUnspecifiedHost(hostname)
  );
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const host = forwardedHost || request.headers.get("host");
  if (!host) return undefined;

  try {
    const hostUrl = new URL(`http://${host}`);
    const protocol =
      forwardedProto ||
      (process.env.NODE_ENV === "production" && !isLocalHost(hostUrl.hostname)
        ? "https"
        : request.nextUrl.protocol.replace(/:$/, ""));
    const origin = new URL(`${protocol}://${host}`);
    if (isUnspecifiedHost(origin.hostname)) {
      origin.hostname = "localhost";
    }

    return origin.origin;
  } catch {
    return undefined;
  }
}

export function getGoogleAdminRedirectUri(request: NextRequest) {
  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) {
    return `${configuredOrigin}${GOOGLE_ADMIN_CALLBACK_PATH}`;
  }

  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin) {
    return `${requestOrigin}${GOOGLE_ADMIN_CALLBACK_PATH}`;
  }

  return siteUrl(GOOGLE_ADMIN_CALLBACK_PATH);
}
