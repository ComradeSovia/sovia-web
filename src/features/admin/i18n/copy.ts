import { createDictionaryGetter } from "@sovia/shared/i18n/dictionary";
import enUS from "./en-US.json";

export type AdminCopy = typeof enUS;

const fallbackCopy = enUS;
const getDictionary = createDictionaryGetter(fallbackCopy, {
  "en-US": enUS,
});

export function getDefaultAdminCopy(): AdminCopy {
  return fallbackCopy;
}

export function getAdminCopy(locale?: string): AdminCopy {
  return getDictionary(locale);
}
