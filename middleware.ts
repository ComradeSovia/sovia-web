import {
  DEFAULT_SOVIA_TEST_LOCALE,
  getSoviaTestLocalizedPath,
  matchSoviaTestLocale,
  SOVIA_TEST_LOCALE_STORAGE_KEY,
  type SoviaTestLocale,
  stripSoviaTestLocaleFromPath,
} from "@sovia/sovia-test/i18n/config";
import { type NextRequest, NextResponse } from "next/server";

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

function redirectToLocale(request: NextRequest, locale: SoviaTestLocale) {
  const url = request.nextUrl.clone();
  const pathWithoutLocale = stripSoviaTestLocaleFromPath(url.pathname);

  url.pathname = getSoviaTestLocalizedPath(pathWithoutLocale, locale);
  url.searchParams.delete("lang");

  const response = NextResponse.redirect(url);
  response.cookies.set(SOVIA_TEST_LOCALE_STORAGE_KEY, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const secondSegment = segments[1];

  if (firstSegment === "test") {
    return redirectToLocale(request, getPreferredLocale(request));
  }

  if (secondSegment === "test" && firstSegment) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/test/:path*", "/:lang/test/:path*"],
};
