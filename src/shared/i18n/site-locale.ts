export const DEFAULT_SITE_LOCALE = "en-US";

export const SITE_LOCALES = [
  "en-US",
  "zh-CN",
  "zh-TW",
  "ja-JP",
  "ko-KR",
  "de-DE",
  "fr-FR",
  "es-ES",
  "pt-BR",
  "ru-RU",
] as const;

export type SiteLocale = (typeof SITE_LOCALES)[number];

export const SITE_LOCALE_LABELS: Record<SiteLocale, string> = {
  "en-US": "English",
  "zh-CN": "中文（简体）",
  "zh-TW": "繁體中文",
  "ja-JP": "日本語",
  "ko-KR": "한국어",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "es-ES": "Español",
  "pt-BR": "Português",
  "ru-RU": "Русский",
};

export const SITE_LOCALE_STORAGE_KEY = "sovia-site-locale";

export function normalizeSiteLocale(value: string) {
  return value.trim().replaceAll("_", "-");
}

export function matchSiteLocale(value: string) {
  const normalizedLocale = normalizeSiteLocale(value);
  const exactLocale = SITE_LOCALES.find(
    (locale) => locale.toLowerCase() === normalizedLocale.toLowerCase(),
  );

  if (exactLocale) {
    return exactLocale;
  }

  const language = normalizedLocale.split("-")[0]?.toLowerCase();
  return SITE_LOCALES.find(
    (locale) => locale.split("-")[0]?.toLowerCase() === language,
  );
}
