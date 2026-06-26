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
  type SoviaTestLocale,
  stripSoviaTestLocaleFromPath,
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

function redirectToLocale(request: NextRequest, locale: SoviaTestLocale) {
  const url = request.nextUrl.clone();
  const pathWithoutLocale = stripSoviaTestLocaleFromPath(url.pathname);
  const siteLocale = getPreferredSiteLocale(request);

  url.pathname = getSiteLocalizedPath(
    getSoviaTestLocalizedPath(pathWithoutLocale, locale),
    siteLocale,
  );
  url.searchParams.delete("lang");

  const response = NextResponse.redirect(url);
  response.cookies.set(SITE_LOCALE_STORAGE_KEY, siteLocale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  response.cookies.set(SOVIA_TEST_LOCALE_STORAGE_KEY, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export function middleware(request: NextRequest) {
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

  if (firstSegment === "test") {
    const pathLocale = secondSegment
      ? matchSoviaTestLocale(secondSegment)
      : null;
    const siteLocale = getPreferredSiteLocale(request);
    const testLocale = pathLocale ?? getPreferredLocale(request);

    const url = request.nextUrl.clone();
    url.pathname = getSiteLocalizedPath(
      getSoviaTestLocalizedPath(pathname, testLocale),
      siteLocale,
    );
    url.searchParams.delete("lang");

    const response = NextResponse.redirect(url);
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

  if (secondSegment === "test" && firstSegment) {
    const siteLocale = matchSiteLocale(firstSegment);

    if (siteLocale) {
      const testLocale = thirdSegment
        ? matchSoviaTestLocale(thirdSegment)
        : getPreferredLocale(request);

      if (!testLocale || !thirdSegment) {
        const url = request.nextUrl.clone();
        url.pathname = getSiteLocalizedPath(
          getSoviaTestLocalizedPath(
            "/test",
            testLocale ?? getPreferredLocale(request),
          ),
          siteLocale,
        );

        const response = NextResponse.redirect(url);
        response.cookies.set(SITE_LOCALE_STORAGE_KEY, siteLocale, {
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        response.cookies.set(
          SOVIA_TEST_LOCALE_STORAGE_KEY,
          testLocale ?? getPreferredLocale(request),
          {
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "lax",
          },
        );

        return response;
      }

      const restPath = segments.slice(3).join("/");
      const url = request.nextUrl.clone();
      url.pathname = restPath ? `/test/${restPath}` : "/test";
      url.searchParams.set("lang", testLocale);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(SITE_LOCALE_HEADER, siteLocale);

      const response = NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
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

    const pathLocale = matchSoviaTestLocale(firstSegment);

    if (!pathLocale) {
      return NextResponse.next();
    }

    const queryLocale = request.nextUrl.searchParams.get("lang");
    const matchedQueryLocale = queryLocale
      ? matchSoviaTestLocale(queryLocale)
      : null;

    if (matchedQueryLocale && matchedQueryLocale !== pathLocale) {
      return redirectToLocale(request, matchedQueryLocale);
    }

    if (firstSegment !== pathLocale) {
      return redirectToLocale(request, pathLocale);
    }

    const response = NextResponse.next();
    response.cookies.set(SOVIA_TEST_LOCALE_STORAGE_KEY, pathLocale, {
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
    "/test/:path*",
    "/:lang",
    "/:lang/test/:path*",
    "/((?!api|_next|.*\\..*).*)",
  ],
};
