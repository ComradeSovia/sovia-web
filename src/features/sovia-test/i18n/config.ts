export const DEFAULT_SOVIA_TEST_LOCALE = "en-US";

export const SOVIA_TEST_LOCALES = [
  "ar",
  "cs-CZ",
  "de-DE",
  "en-US",
  "es-ES",
  "fa-IR",
  "fr-FR",
  "hi-IN",
  "hu-HU",
  "id-ID",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "nl-NL",
  "pl-PL",
  "pt-BR",
  "ru-RU",
  "th-TH",
  "tr-TR",
  "uk-UA",
  "vi-VN",
  "zh-CN",
  "zh-TW",
] as const;

export type SoviaTestLocale = (typeof SOVIA_TEST_LOCALES)[number];

export const SOVIA_TEST_LOCALE_LABELS: Record<SoviaTestLocale, string> = {
  ar: "العربية",
  "cs-CZ": "Čeština",
  "de-DE": "Deutsch",
  "en-US": "English",
  "es-ES": "Español",
  "fa-IR": "فارسی",
  "fr-FR": "Français",
  "hi-IN": "हिन्दी",
  "hu-HU": "Magyar",
  "id-ID": "Bahasa Indonesia",
  "it-IT": "Italiano",
  "ja-JP": "日本語",
  "ko-KR": "한국어",
  "nl-NL": "Nederlands",
  "pl-PL": "Polish",
  "pt-BR": "Português",
  "ru-RU": "Русский",
  "th-TH": "ไทย",
  "tr-TR": "Türkçe",
  "uk-UA": "Українська",
  "vi-VN": "Tiếng Việt",
  "zh-CN": "中文（简体）",
  "zh-TW": "繁體中文",
};

export const SOVIA_TEST_LOCALE_STORAGE_KEY = "sovia-test-locale";

export type SoviaTestSearchParams = {
  lang?: string | string[];
};

export function normalizeSoviaTestLocale(value: string) {
  return value.trim().replaceAll("_", "-");
}

export function matchSoviaTestLocale(value: string) {
  const normalizedLocale = normalizeSoviaTestLocale(value);
  const exactLocale = SOVIA_TEST_LOCALES.find(
    (locale) => locale.toLowerCase() === normalizedLocale.toLowerCase(),
  );

  if (exactLocale) {
    return exactLocale;
  }

  const language = normalizedLocale.split("-")[0]?.toLowerCase();
  return SOVIA_TEST_LOCALES.find(
    (locale) => locale.split("-")[0]?.toLowerCase() === language,
  );
}

export function getSoviaTestLocaleFromSearchParams(
  searchParams?: SoviaTestSearchParams,
) {
  const lang = Array.isArray(searchParams?.lang)
    ? searchParams.lang[0]
    : searchParams?.lang;

  if (!lang) {
    return DEFAULT_SOVIA_TEST_LOCALE;
  }

  return matchSoviaTestLocale(lang) ?? DEFAULT_SOVIA_TEST_LOCALE;
}

export function getSoviaTestLocalizedPath(
  path: string,
  locale: SoviaTestLocale,
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const pathWithoutLocale = stripSoviaTestLocaleFromPath(normalizedPath);
  const pathWithoutTestPrefix = pathWithoutLocale.startsWith("/test")
    ? pathWithoutLocale.slice("/test".length)
    : pathWithoutLocale;

  return `/test/${locale}${pathWithoutTestPrefix}`;
}

export function getSoviaTestLanguageAlternates(path: string) {
  return Object.fromEntries(
    SOVIA_TEST_LOCALES.map((locale) => [
      locale,
      getSoviaTestLocalizedPath(path, locale),
    ]),
  ) as Record<SoviaTestLocale, string>;
}

export function getSoviaTestLocaleFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const secondSegment = segments[1];

  if (!firstSegment) {
    return null;
  }

  if (firstSegment === "test" && secondSegment) {
    return matchSoviaTestLocale(secondSegment) ?? null;
  }

  return matchSoviaTestLocale(firstSegment) ?? null;
}

export function stripSoviaTestLocaleFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const secondSegment = segments[1];

  if (
    firstSegment === "test" &&
    secondSegment &&
    matchSoviaTestLocale(secondSegment)
  ) {
    return `/test/${segments.slice(2).join("/")}`.replace(/\/$/, "");
  }

  if (firstSegment && matchSoviaTestLocale(firstSegment)) {
    return `/${segments.slice(1).join("/")}`;
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
