import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import canon from "../../../../data/canon/sovia.json";

type CharacterId = keyof typeof canon.entities.characters;

export function getCharacterDisplayName(id: CharacterId, locale: SiteLocale) {
  return canon.entities.characters[id].localizedNames[locale];
}
