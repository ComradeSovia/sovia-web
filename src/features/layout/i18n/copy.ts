import { createDictionaryGetter } from "@sovia/shared/i18n/dictionary";
import enUS from "./en-US.json";

export type LayoutCopy = typeof enUS;

const fallbackCopy = enUS;
const getDictionary = createDictionaryGetter(fallbackCopy, {
  "en-US": enUS,
});

export function getDefaultLayoutCopy(): LayoutCopy {
  return fallbackCopy;
}

export function getLayoutCopy(locale?: string): LayoutCopy {
  return getDictionary(locale);
}
