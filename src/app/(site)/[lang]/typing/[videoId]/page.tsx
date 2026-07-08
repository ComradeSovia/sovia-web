import { matchSiteLocale } from "@sovia/shared/i18n/site-locale";
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

type LocalizedTypingPageParams = Promise<{ lang: string; videoId: string }>;
type LocalizedTypingPageSearchParams = Promise<{
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
  params: LocalizedTypingPageParams;
}): Promise<Metadata> {
  const { videoId } = await params;

  return {
    title: `Typing Game: ${videoId}`,
    description:
      "Prototype subtitle typing game powered by local SRT files and YouTube playback.",
  };
}

export default async function LocalizedTypingPage({
  params,
  searchParams,
}: {
  params: LocalizedTypingPageParams;
  searchParams: LocalizedTypingPageSearchParams;
}) {
  const [{ lang: siteLang, videoId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = matchSiteLocale(siteLang);

  if (!locale || !isSafeWorkId(videoId)) {
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
        selectHref={`/${locale}/typing?typingLang=${lang}&difficulty=${difficulty}&videoId=${videoId}`}
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
