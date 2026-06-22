import { cookies } from "next/headers";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
  SITE_LOCALE_STORAGE_KEY,
} from "./site-locale";

export async function getCurrentSiteLocale() {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(SITE_LOCALE_STORAGE_KEY)?.value;

  return savedLocale
    ? (matchSiteLocale(savedLocale) ?? DEFAULT_SITE_LOCALE)
    : DEFAULT_SITE_LOCALE;
}
