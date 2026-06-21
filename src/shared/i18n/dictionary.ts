import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
  type SiteLocale,
} from "./site-locale";

type Primitive = string | number | boolean | null | undefined;

export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepPartial<Item>[]
    : T extends (infer Item)[]
      ? DeepPartial<Item>[]
      : {
          [Key in keyof T]?: DeepPartial<T[Key]>;
        };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeWithFallback<T>(
  fallback: T,
  override?: DeepPartial<T>,
): T {
  if (override === undefined) {
    return fallback;
  }

  if (Array.isArray(fallback) || Array.isArray(override)) {
    return override as T;
  }

  if (isRecord(fallback) && isRecord(override)) {
    const merged: Record<string, unknown> = { ...fallback };

    for (const [key, value] of Object.entries(override)) {
      merged[key] = mergeWithFallback(
        fallback[key as keyof typeof fallback],
        value as DeepPartial<T[keyof T]>,
      );
    }

    return merged as T;
  }

  return override as T;
}

export function createDictionaryGetter<T>(
  fallback: T,
  dictionaries: Partial<Record<SiteLocale, DeepPartial<T>>>,
) {
  return function getDictionary(locale = DEFAULT_SITE_LOCALE): T {
    const matchedLocale = matchSiteLocale(locale) ?? DEFAULT_SITE_LOCALE;
    return mergeWithFallback(fallback, dictionaries[matchedLocale]);
  };
}
