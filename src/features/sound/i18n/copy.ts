import { createDictionaryGetter } from "@sovia/shared/i18n/dictionary";
import enUS from "./en-US.json";

export type SoundCopy = typeof enUS;

const fallbackCopy = enUS;
const getDictionary = createDictionaryGetter(fallbackCopy, {
  "en-US": enUS,
});

export function getDefaultSoundCopy(): SoundCopy {
  return fallbackCopy;
}

export function getSoundCopy(locale?: string): SoundCopy {
  return getDictionary(locale);
}
