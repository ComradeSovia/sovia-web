import { createDictionaryGetter } from "./dictionary";
import enUS from "./en-US.json";

export type SharedCopy = typeof enUS;

const fallbackCopy = enUS;
const getDictionary = createDictionaryGetter(fallbackCopy, {
  "en-US": enUS,
});

export function getDefaultSharedCopy(): SharedCopy {
  return fallbackCopy;
}

export function getSharedCopy(locale?: string): SharedCopy {
  return getDictionary(locale);
}
