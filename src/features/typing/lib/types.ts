export type CaptionCue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
};

export type TypingLang = "en" | "ru" | "ru-latin";

export type TypingDifficulty = "easy" | "medium" | "hard";

export type TypingCue = {
  index: number;
  startMs: number;
  endMs: number;
  displayText: string;
  sourceText: string;
  targetMap: number[];
  targetText: string;
  lang: TypingLang;
  difficulty: TypingDifficulty;
};
