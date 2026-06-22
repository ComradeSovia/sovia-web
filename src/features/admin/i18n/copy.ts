import { createDictionaryGetter } from "@sovia/shared/i18n/dictionary";
import enUS from "./en-US.json";
import jaJP from "./ja-JP.json";
import koKR from "./ko-KR.json";
import ruRU from "./ru-RU.json";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";

export type AdminCopy = typeof enUS;

const fallbackCopy = enUS;
const getDictionary = createDictionaryGetter(fallbackCopy, {
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "ja-JP": jaJP,
  "ko-KR": koKR,
  "ru-RU": ruRU,
});

export function getDefaultAdminCopy(): AdminCopy {
  return fallbackCopy;
}

export function getAdminCopy(locale?: string): AdminCopy {
  return getDictionary(locale);
}
