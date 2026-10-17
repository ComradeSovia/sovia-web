import canon from "../../../data/canon/sovia.json";

type CharacterId = keyof typeof canon.entities.characters;

export function getCharacterPath(id: CharacterId) {
  const slug = id === "kata" ? canon.entities.characters.kata.publicSlug : id;
  return `/characters/${slug}`;
}
