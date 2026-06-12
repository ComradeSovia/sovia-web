import type { SoviaTestCopy } from "../types";
import ar from "./ar.json";
import { DEFAULT_SOVIA_TEST_LOCALE, type SoviaTestLocale } from "./config";
import csCZ from "./cs-CZ.json";
import deDE from "./de-DE.json";
import enUS from "./en-US.json";
import esES from "./es-ES.json";
import faIR from "./fa-IR.json";
import frFR from "./fr-FR.json";
import hiIN from "./hi-IN.json";
import huHU from "./hu-HU.json";
import idID from "./id-ID.json";
import itIT from "./it-IT.json";
import jaJP from "./ja-JP.json";
import koKR from "./ko-KR.json";
import nlNL from "./nl-NL.json";
import plPL from "./pl-PL.json";
import ptBR from "./pt-BR.json";
import ruRU from "./ru-RU.json";
import thTH from "./th-TH.json";
import trTR from "./tr-TR.json";
import ukUA from "./uk-UA.json";
import viVN from "./vi-VN.json";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";

const copyByLocale: Record<SoviaTestLocale, SoviaTestCopy> = {
  ar: ar as SoviaTestCopy,
  "cs-CZ": csCZ as SoviaTestCopy,
  "de-DE": deDE as SoviaTestCopy,
  "en-US": enUS as SoviaTestCopy,
  "es-ES": esES as SoviaTestCopy,
  "fa-IR": faIR as SoviaTestCopy,
  "fr-FR": frFR as SoviaTestCopy,
  "hi-IN": hiIN as SoviaTestCopy,
  "hu-HU": huHU as SoviaTestCopy,
  "id-ID": idID as SoviaTestCopy,
  "it-IT": itIT as SoviaTestCopy,
  "ja-JP": jaJP as SoviaTestCopy,
  "ko-KR": koKR as SoviaTestCopy,
  "nl-NL": nlNL as SoviaTestCopy,
  "pl-PL": plPL as SoviaTestCopy,
  "pt-BR": ptBR as SoviaTestCopy,
  "ru-RU": ruRU as SoviaTestCopy,
  "th-TH": thTH as SoviaTestCopy,
  "tr-TR": trTR as SoviaTestCopy,
  "uk-UA": ukUA as SoviaTestCopy,
  "vi-VN": viVN as SoviaTestCopy,
  "zh-CN": zhCN as SoviaTestCopy,
  "zh-TW": zhTW as SoviaTestCopy,
};

export function getDefaultSoviaTestCopy() {
  return copyByLocale[DEFAULT_SOVIA_TEST_LOCALE];
}

export function getSoviaTestCopy(locale: SoviaTestLocale) {
  return copyByLocale[locale];
}
