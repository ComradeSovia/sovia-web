import { matchSiteLocale, SITE_LOCALES, type SiteLocale } from "./site-locale";

export const SITE_LOCALE_HEADER = "x-sovia-site-locale";

function splitPath(path: string) {
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const pathWithoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = pathWithoutHash.indexOf("?");
  const query = queryIndex >= 0 ? pathWithoutHash.slice(queryIndex) : "";
  const pathname =
    queryIndex >= 0 ? pathWithoutHash.slice(0, queryIndex) : pathWithoutHash;

  return {
    hash,
    pathname: pathname || "/",
    query,
  };
}

export function getSiteLocalizedPath(path: string, locale: SiteLocale) {
  if (path.startsWith("http") || path.startsWith("mailto:")) {
    return path;
  }

  const { hash, pathname, query } = splitPath(path);
  const normalizedPathname = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`;
  const pathWithoutLocale = stripSiteLocaleFromPath(normalizedPathname);

  return `/${locale}${
    pathWithoutLocale === "/" ? "" : pathWithoutLocale
  }${query}${hash}`;
}

export function getSiteLanguageAlternates(path: string) {
  return Object.fromEntries(
    SITE_LOCALES.map((locale) => [locale, getSiteLocalizedPath(path, locale)]),
  ) as Record<SiteLocale, string>;
}

export function getSiteMetadataAlternates(path: string, locale: SiteLocale) {
  return {
    canonical: getSiteLocalizedPath(path, locale),
    languages: {
      "x-default": getSiteLocalizedPath(path, "en-US"),
      ...getSiteLanguageAlternates(path),
    },
  };
}

export function stripSiteLocaleFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const pathLocale = firstSegment ? matchSiteLocale(firstSegment) : null;

  if (!pathLocale) {
    return pathname || "/";
  }

  const strippedPath = `/${segments.slice(1).join("/")}`;
  return strippedPath === "/" ? "/" : strippedPath.replace(/\/$/, "");
}
