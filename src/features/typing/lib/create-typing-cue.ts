import { transliterateRuToLatin } from "./transliterate-ru";
import type {
  CaptionCue,
  TypingCue,
  TypingDifficulty,
  TypingLang,
} from "./types";

const LATIN_VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);
const CYRILLIC_VOWELS = new Set([
  "а",
  "е",
  "ё",
  "и",
  "о",
  "у",
  "ы",
  "э",
  "ю",
  "я",
]);

type TypingCharacter = {
  char: string;
  displayIndex: number;
};

function isTypingCharacter(char: string) {
  return /\p{L}|\p{N}/u.test(char);
}

function isWordJoiner(char: string) {
  return char === "'" || char === "-" || char === "’";
}

function isConsonant(char: string) {
  if (!/\p{L}/u.test(char)) {
    return /\p{N}/u.test(char);
  }

  return !LATIN_VOWELS.has(char) && !CYRILLIC_VOWELS.has(char);
}

function getTypingCharactersForDisplayChar(char: string, displayIndex: number) {
  return Array.from(char.toLowerCase())
    .filter(isTypingCharacter)
    .map((typingChar) => ({
      char: typingChar,
      displayIndex,
    }));
}

function getTypingWords(displayText: string, lang: TypingLang) {
  const words: TypingCharacter[][] = [];
  let currentWord: TypingCharacter[] = [];

  for (const [displayIndex, displayChar] of Array.from(displayText).entries()) {
    const source =
      lang === "ru-latin" ? transliterateRuToLatin(displayChar) : displayChar;
    const typingCharacters = getTypingCharactersForDisplayChar(
      source,
      displayIndex,
    );

    if (typingCharacters.length > 0) {
      currentWord.push(...typingCharacters);
      continue;
    }

    if (isWordJoiner(displayChar) && currentWord.length > 0) {
      continue;
    }

    if (currentWord.length > 0) {
      words.push(currentWord);
      currentWord = [];
    }
  }

  if (currentWord.length > 0) {
    words.push(currentWord);
  }

  return words;
}

function createTypingTargetPlan(
  displayText: string,
  lang: TypingLang,
  difficulty: TypingDifficulty,
) {
  const words = getTypingWords(displayText, lang);
  const characters =
    difficulty === "easy"
      ? words.flatMap((word) => word[0] ?? [])
      : difficulty === "medium"
        ? words.flatMap((word) => word.filter(({ char }) => isConsonant(char)))
        : words.flat();

  return {
    targetMap: characters.map(({ displayIndex }) => displayIndex),
    targetText: characters.map(({ char }) => char).join(""),
  };
}

export function createTypingTarget(
  sourceText: string,
  difficulty: TypingDifficulty,
) {
  return createTypingTargetPlan(sourceText, "en", difficulty).targetText;
}

export function createTypingCue(
  cue: CaptionCue,
  lang: TypingLang,
  difficulty: TypingDifficulty,
): TypingCue {
  const sourceText =
    lang === "ru-latin" ? transliterateRuToLatin(cue.text) : cue.text;
  const { targetMap, targetText } = createTypingTargetPlan(
    cue.text,
    lang,
    difficulty,
  );

  return {
    index: cue.index,
    startMs: cue.startMs,
    endMs: cue.endMs,
    displayText: cue.text,
    sourceText,
    targetMap,
    targetText,
    lang,
    difficulty,
  };
}

export function createTypingCues(
  cues: CaptionCue[],
  lang: TypingLang,
  difficulty: TypingDifficulty,
) {
  return cues
    .map((cue) => createTypingCue(cue, lang, difficulty))
    .filter((cue) => cue.targetText.length > 0);
}
