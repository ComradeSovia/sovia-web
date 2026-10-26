import { createDictionaryGetter } from "@sovia/shared/i18n/dictionary";
import enUS from "./en-US.json";
import jaJP from "./ja-JP.json";
import koKR from "./ko-KR.json";
import ruRU from "./ru-RU.json";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";

export type OpenCultureCopy = typeof enUS;

export const getOpenCultureCopy = createDictionaryGetter<OpenCultureCopy>(
  enUS,
  {
    "en-US": enUS,
    "ja-JP": jaJP,
    "ko-KR": koKR,
    "ru-RU": ruRU,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
  },
);
