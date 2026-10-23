import {
  matchSiteLocale,
  SITE_LOCALE_STORAGE_KEY,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import {
  getSiteLocalizedPath,
  SITE_LOCALE_HEADER,
  stripSiteLocaleFromPath,
} from "@sovia/shared/i18n/site-routing";
import {
  DEFAULT_SOVIA_TEST_LOCALE,
  getSoviaTestLocalizedPath,
  matchSoviaTestLocale,
  SOVIA_TEST_LOCALE_STORAGE_KEY,
  SOVIA_TEST_PATH,
  type SoviaTestLocale,
} from "@sovia/sovia-test/i18n/config";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

function getPreferredLocale(request: NextRequest): SoviaTestLocale {
  const queryLocale = request.nextUrl.searchParams.get("lang");
  const matchedQueryLocale = queryLocale
    ? matchSoviaTestLocale(queryLocale)
    : null;

  if (matchedQueryLocale) {
    return matchedQueryLocale;
  }

  const savedLocale = request.cookies.get(SOVIA_TEST_LOCALE_STORAGE_KEY)?.value;
  const matchedSavedLocale = savedLocale
    ? matchSoviaTestLocale(savedLocale)
    : null;

  if (matchedSavedLocale) {
    return matchedSavedLocale;
  }

  const acceptLanguage = request.headers.get("accept-language");

  if (acceptLanguage) {
    for (const language of acceptLanguage.split(",")) {
      const locale = language.split(";")[0]?.trim();
      const matchedLocale = locale ? matchSoviaTestLocale(locale) : null;

      if (matchedLocale) {
        return matchedLocale;
      }
    }
  }

  return DEFAULT_SOVIA_TEST_LOCALE;
}

function getPreferredSiteLocale(request: NextRequest): SiteLocale {
  const savedLocale = request.cookies.get(SITE_LOCALE_STORAGE_KEY)?.value;
  const matchedSavedLocale = savedLocale ? matchSiteLocale(savedLocale) : null;

  if (matchedSavedLocale) {
    return matchedSavedLocale;
  }

  const acceptLanguage = request.headers.get("accept-language");

  if (acceptLanguage) {
    for (const language of acceptLanguage.split(",")) {
      const locale = language.split(";")[0]?.trim();
      const matchedLocale = locale ? matchSiteLocale(locale) : null;

      if (matchedLocale) {
        return matchedLocale;
      }
    }
  }

  return "en-US";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const secondSegment = segments[1];
  const thirdSegment = segments[2];

  if (firstSegment === "admin") {
    return NextResponse.next();
  }

  if (
    firstSegment &&
    matchSiteLocale(firstSegment) &&
    secondSegment === "admin"
  ) {
    return NextResponse.next();
  }

  const isLegacyTest =
    firstSegment === "test" ||
    (secondSegment === "test" &&
      Boolean(firstSegment && matchSoviaTestLocale(firstSegment)));
  const isLabTest = firstSegment === "lab" && secondSegment === "sovia-test";
  const isLocalizedLabTest =
    Boolean(firstSegment && matchSiteLocale(firstSegment)) &&
    secondSegment === "lab" &&
    thirdSegment === "sovia-test";

  if (isLegacyTest || isLabTest || isLocalizedLabTest) {
    const siteLocale =
      isLocalizedLabTest || (isLegacyTest && secondSegment === "test")
        ? (matchSiteLocale(firstSegment) ?? getPreferredSiteLocale(request))
        : getPreferredSiteLocale(request);
    const suffix = segments.slice(
      isLocalizedLabTest ? 3 : firstSegment === "test" ? 1 : 2,
    );
    const explicitTestLocale = suffix[0]
      ? matchSoviaTestLocale(suffix[0])
      : null;
    const legacyLocale =
      secondSegment === "test" && firstSegment && !matchSiteLocale(firstSegment)
        ? matchSoviaTestLocale(firstSegment)
        : null;
    const testLocale =
      explicitTestLocale ?? legacyLocale ?? getPreferredLocale(request);
    const rest = explicitTestLocale ? suffix.slice(1) : suffix;
    const testPath =
      SOVIA_TEST_PATH + (rest.length ? `/${rest.join("/")}` : "");
    const canonicalPath = getSiteLocalizedPath(
      getSoviaTestLocalizedPath(testPath, testLocale),
      siteLocale,
    );
    const url = request.nextUrl.clone();
    let response: NextResponse;
    if (pathname !== canonicalPath || url.searchParams.has("lang")) {
      url.pathname = canonicalPath;
      url.searchParams.delete("lang");
      response = NextResponse.redirect(url, isLegacyTest ? 308 : 307);
    } else {
      url.pathname = testPath;
      url.searchParams.set("lang", testLocale);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(SITE_LOCALE_HEADER, siteLocale);
      response = NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      });
    }
    response.cookies.set(SITE_LOCALE_STORAGE_KEY, siteLocale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    response.cookies.set(SOVIA_TEST_LOCALE_STORAGE_KEY, testLocale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const queryLocale = request.nextUrl.searchParams.get("lang");
  const matchedSiteLocale = queryLocale ? matchSiteLocale(queryLocale) : null;

  if (matchedSiteLocale) {
    const url = request.nextUrl.clone();
    url.pathname = getSiteLocalizedPath(pathname, matchedSiteLocale);
    url.searchParams.delete("lang");

    const response = NextResponse.redirect(url);
    response.cookies.set(SITE_LOCALE_STORAGE_KEY, matchedSiteLocale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return response;
  }

  const pathLocale = firstSegment ? matchSiteLocale(firstSegment) : null;

  if (pathLocale) {
    const strippedPath = stripSiteLocaleFromPath(pathname);

    const url = request.nextUrl.clone();
    url.pathname = strippedPath;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(SITE_LOCALE_HEADER, pathLocale);

    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });

    response.cookies.set(SITE_LOCALE_STORAGE_KEY, pathLocale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return response;
  }

  const siteLocale = getPreferredSiteLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = getSiteLocalizedPath(pathname, siteLocale);

  const response = NextResponse.redirect(url);
  response.cookies.set(SITE_LOCALE_STORAGE_KEY, siteLocale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: [
    "/lab/sovia-test/:path*",
    "/:lang",
    "/:lang/lab/sovia-test/:path*",
    "/((?!api|_next|.*\\..*).*)",
  ],
};
