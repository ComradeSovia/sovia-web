import { siteUrl } from "@sovia/shared";

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

function getFallbackOrigin() {
  return new URL(siteUrl("/")).origin;
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

function getRequestUrl(request: Request) {
  try {
    return new URL(request.url);
  } catch {
    return undefined;
  }
}

export function getAdminRequestOrigin(request?: Request) {
  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) return configuredOrigin;

  if (!request) return getFallbackOrigin();

  const requestUrl = getRequestUrl(request);
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const forwardedSsl = firstHeaderValue(request.headers.get("x-forwarded-ssl"));
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    try {
      const hostUrl = new URL(`http://${host}`);
      const protocol =
        forwardedProto ||
        (forwardedSsl === "on" ? "https" : undefined) ||
        (process.env.NODE_ENV === "production" && !isLocalHost(hostUrl.hostname)
          ? "https"
          : requestUrl?.protocol.replace(/:$/, "") || "http");
      const origin = new URL(`${protocol}://${host}`);

      if (isUnspecifiedHost(origin.hostname)) {
        origin.hostname =
          process.env.NODE_ENV === "production" ? "sovia.work" : "localhost";
      }

      return origin.origin;
    } catch {
      // Fall through to request URL / configured fallback.
    }
  }

  if (requestUrl && !isUnspecifiedHost(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  return getFallbackOrigin();
}

export function getAdminUrl(path = "/admin", request?: Request) {
  if (/^https?:\/\//i.test(path)) return new URL(path);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${getAdminRequestOrigin(request)}/`);
}
