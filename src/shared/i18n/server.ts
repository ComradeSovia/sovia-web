import { cookies, headers } from "next/headers";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
  SITE_LOCALE_STORAGE_KEY,
} from "./site-locale";
import { SITE_LOCALE_HEADER } from "./site-routing";

export async function getCurrentSiteLocale() {
  const headerStore = await headers();
  const requestLocale = headerStore.get(SITE_LOCALE_HEADER);
  const matchedRequestLocale = requestLocale
    ? matchSiteLocale(requestLocale)
    : null;

  if (matchedRequestLocale) {
    return matchedRequestLocale;
  }

  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(SITE_LOCALE_STORAGE_KEY)?.value;

  return savedLocale
    ? (matchSiteLocale(savedLocale) ?? DEFAULT_SITE_LOCALE)
    : DEFAULT_SITE_LOCALE;
}
