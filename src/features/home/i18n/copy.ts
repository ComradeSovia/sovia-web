import { createDictionaryGetter } from "@sovia/shared/i18n/dictionary";
import enUS from "./en-US.json";

export type HomeCopy = typeof enUS;

const fallbackCopy = enUS;
const getDictionary = createDictionaryGetter(fallbackCopy, {
  "en-US": enUS,
});

export function getDefaultHomeCopy(): HomeCopy {
  return fallbackCopy;
}

export function getHomeCopy(locale?: string): HomeCopy {
  return getDictionary(locale);
}
