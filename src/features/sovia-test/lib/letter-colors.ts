import type { SoviaLetter } from "../types";

export const SOVIA_LETTER_COLORS = {
  S: "#B21F1F",
  F: "#D86B2A",
  O: "#F2B544",
  E: "#B89A6A",
  V: "#D62E2E",
  Q: "#2F4A3C",
  I: "#4F6F8F",
  M: "#8E3F5F",
  A: "#6F8A4A",
  L: "#2D3142",
} as const satisfies Record<SoviaLetter, string>;

export function getSoviaLetterColor(letter: string) {
  return SOVIA_LETTER_COLORS[letter as SoviaLetter] ?? "#B21F1F";
}
