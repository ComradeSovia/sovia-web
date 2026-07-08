import {
  getTypingWorkOptions,
  isSafeWorkId,
  type TypingDifficulty,
  type TypingLang,
  TypingSelectPage,
} from "@sovia/typing";
import type { Metadata } from "next";

type TypingSearchParams = Promise<{
  difficulty?: string;
  lang?: string;
  q?: string;
  shuffle?: string;
  typingLang?: string;
  videoId?: string;
}>;

const TYPING_LANGS = new Set<TypingLang>(["en", "ru", "ru-latin"]);
const TYPING_DIFFICULTIES = new Set<TypingDifficulty>([
  "easy",
  "medium",
  "hard",
]);

function matchTypingLang(value: string | undefined): TypingLang {
  return value && TYPING_LANGS.has(value as TypingLang)
    ? (value as TypingLang)
    : "en";
}

function matchTypingDifficulty(value: string | undefined): TypingDifficulty {
  return value && TYPING_DIFFICULTIES.has(value as TypingDifficulty)
    ? (value as TypingDifficulty)
    : "easy";
}

export const metadata: Metadata = {
  title: "Typing Game",
  description:
    "Choose a local subtitle track and play the prototype typing game.",
};

export default async function TypingIndexPage({
  searchParams,
}: {
  searchParams: TypingSearchParams;
}) {
  const query = await searchParams;
  const lang = matchTypingLang(query.typingLang ?? query.lang);
  const difficulty = matchTypingDifficulty(query.difficulty);
  const works = await getTypingWorkOptions();
  const selectedWorkId =
    query.videoId && isSafeWorkId(query.videoId) ? query.videoId : undefined;

  return (
    <TypingSelectPage
      difficulty={difficulty}
      lang={lang}
      searchQuery={query.q}
      selectedWorkId={selectedWorkId}
      shuffleSeed={query.shuffle}
      works={works}
    />
  );
}
