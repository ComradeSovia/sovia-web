import type { SoviaTestCopy } from "../types";
import type { SoviaTestLocale } from "./config";
const loaders = {
  ar: () => import("./ar.json"),
  "cs-CZ": () => import("./cs-CZ.json"),
  "de-DE": () => import("./de-DE.json"),
  "en-US": () => import("./en-US.json"),
  "es-ES": () => import("./es-ES.json"),
  "fa-IR": () => import("./fa-IR.json"),
  "fr-FR": () => import("./fr-FR.json"),
  "hi-IN": () => import("./hi-IN.json"),
  "hu-HU": () => import("./hu-HU.json"),
  "id-ID": () => import("./id-ID.json"),
  "it-IT": () => import("./it-IT.json"),
  "ja-JP": () => import("./ja-JP.json"),
  "ko-KR": () => import("./ko-KR.json"),
  "nl-NL": () => import("./nl-NL.json"),
  "pl-PL": () => import("./pl-PL.json"),
  "pt-BR": () => import("./pt-BR.json"),
  "ru-RU": () => import("./ru-RU.json"),
  "th-TH": () => import("./th-TH.json"),
  "tr-TR": () => import("./tr-TR.json"),
  "uk-UA": () => import("./uk-UA.json"),
  "vi-VN": () => import("./vi-VN.json"),
  "zh-CN": () => import("./zh-CN.json"),
  "zh-TW": () => import("./zh-TW.json"),
};
export async function loadSoviaTestCopy(
  locale: SoviaTestLocale,
): Promise<SoviaTestCopy> {
  return (await loaders[locale]()).default as SoviaTestCopy;
}
