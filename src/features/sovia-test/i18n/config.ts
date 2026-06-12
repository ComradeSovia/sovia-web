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
