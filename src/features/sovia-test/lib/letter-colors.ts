import type { SoviaLetter } from "../types";

export const SOVIA_LETTER_COLORS = {
  S: "#B11226",
  F: "#168C8C",
  O: "#F2B705",
  E: "#7A542E",
  V: "#E34234",
  Q: "#1F4D3A",
  I: "#2D6FA3",
  M: "#8A3D8F",
  A: "#5FA03A",
  L: "#1C2438",
} as const satisfies Record<SoviaLetter, string>;

export function getSoviaLetterColor(letter: string) {
  return SOVIA_LETTER_COLORS[letter as SoviaLetter] ?? "#B11226";
}
