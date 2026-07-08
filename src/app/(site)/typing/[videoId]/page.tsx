import {
  getTypingWorkOption,
  isLangAvailableForWork,
  isSafeWorkId,
  loadTypingCues,
  type TypingDifficulty,
  TypingGame,
  type TypingLang,
} from "@sovia/typing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type TypingPageParams = Promise<{ videoId: string }>;
type TypingPageSearchParams = Promise<{
  difficulty?: string;
  lang?: string;
  typingLang?: string;
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

export async function generateMetadata({
  params,
}: {
  params: TypingPageParams;
}): Promise<Metadata> {
  const { videoId } = await params;

  return {
    title: `Typing Game: ${videoId}`,
    description:
      "Prototype subtitle typing game powered by local SRT files and YouTube playback.",
  };
}

export default async function TypingPage({
  params,
  searchParams,
}: {
  params: TypingPageParams;
  searchParams: TypingPageSearchParams;
}) {
  const [{ videoId }, query] = await Promise.all([params, searchParams]);

  if (!isSafeWorkId(videoId)) {
    notFound();
  }

  const lang = matchTypingLang(query.typingLang ?? query.lang);
  const difficulty = matchTypingDifficulty(query.difficulty);
  const work = await getTypingWorkOption(videoId);

  if (!work || !isLangAvailableForWork(work, lang)) {
    notFound();
  }

  try {
    const cues = await loadTypingCues({ difficulty, lang, workId: videoId });

    if (cues.length === 0) {
      notFound();
    }

    return (
      <TypingGame
        cues={cues}
        difficulty={difficulty}
        lang={lang}
        selectHref={`/typing?typingLang=${lang}&difficulty=${difficulty}&videoId=${videoId}`}
        title={work.title}
        youtubeId={work.youtubeId}
      />
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      notFound();
    }

    throw error;
  }
}
