"use client";

import type { TypingCue, TypingDifficulty, TypingLang } from "@sovia/typing";
import { ArrowLeft, Keyboard, Pause, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlayerEvent = {
  target: YouTubePlayer;
};

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

type YouTubePlayerConstructor = new (
  elementId: string,
  options: {
    videoId: string;
    playerVars: Record<string, number>;
    events: {
      onReady: (event: PlayerEvent) => void;
    };
  },
) => YouTubePlayer;

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerConstructor;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function normalizeInputCharacter(char: string) {
  const normalized = char.toLowerCase();

  return /\p{L}|\p{N}/u.test(normalized) ? normalized : "";
}

function getCueAt(cues: TypingCue[], currentMs: number) {
  return (
    cues.find((cue) => currentMs >= cue.startMs && currentMs <= cue.endMs) ??
    null
  );
}

function countMatchingPrefix(target: string, input: string) {
  let count = 0;

  for (let index = 0; index < input.length && index < target.length; index++) {
    if (input[index] !== target[index]) {
      break;
    }

    count++;
  }

  return count;
}

function getAccuracy(correctChars: number, typedChars: number) {
  if (typedChars === 0) {
    return 100;
  }

  return Math.round((correctChars / typedChars) * 100);
}

function formatGameLang(lang: TypingLang) {
  return lang === "ru-latin" ? "RULATIN" : lang.toUpperCase();
}

function formatCountdown(ms: number | null) {
  if (ms === null) {
    return "Final lyric";
  }

  return `Next lyric in ${(ms / 1000).toFixed(1)}s`;
}

function formatSeconds(ms: number | null) {
  if (ms === null) {
    return "-";
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

function getDisplayCharacterState(
  cue: TypingCue,
  displayIndex: number,
  input: string,
) {
  const targetIndexes = cue.targetMap
    .map((mappedDisplayIndex, targetIndex) => ({
      mappedDisplayIndex,
      targetIndex,
    }))
    .filter(({ mappedDisplayIndex }) => mappedDisplayIndex === displayIndex)
    .map(({ targetIndex }) => targetIndex);

  if (targetIndexes.length === 0) {
    return "neutral";
  }

  const typedIndexes = targetIndexes.filter(
    (targetIndex) => input[targetIndex] !== undefined,
  );

  if (
    typedIndexes.some(
      (targetIndex) => input[targetIndex] !== cue.targetText[targetIndex],
    )
  ) {
    return "wrong";
  }

  if (typedIndexes.length === targetIndexes.length) {
    return "correct";
  }

  if (targetIndexes.includes(input.length)) {
    return "active";
  }

  return "pending";
}

export function TypingGame({
  cues,
  difficulty,
  lang,
  selectHref = "/typing",
  title,
  youtubeId,
}: {
  cues: TypingCue[];
  difficulty: TypingDifficulty;
  lang: TypingLang;
  selectHref?: string;
  title: string;
  youtubeId: string;
}) {
  const [currentMs, setCurrentMs] = useState(0);
  const [currentCueIndex, setCurrentCueIndex] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const completedCueIndexes = useRef(new Set<number>());

  const currentCue = useMemo(
    () => getCueAt(cues, currentMs),
    [cues, currentMs],
  );
  const matchingPrefix = currentCue
    ? countMatchingPrefix(currentCue.targetText, input)
    : 0;
  const accuracy = getAccuracy(correctChars, typedChars);
  const nextCue = useMemo(
    () => cues.find((cue) => cue.startMs > currentMs) ?? null,
    [cues, currentMs],
  );
  const nextCueCountdownMs = nextCue
    ? Math.max(0, nextCue.startMs - currentMs)
    : null;
  const previousCue = useMemo(
    () => [...cues].reverse().find((cue) => cue.endMs <= currentMs) ?? null,
    [cues, currentMs],
  );
  const nextCueProgressStartMs =
    currentCue?.startMs ?? previousCue?.endMs ?? currentMs;
  const nextCueProgressTotalMs = nextCue
    ? Math.max(1, nextCue.startMs - nextCueProgressStartMs)
    : 1;
  const nextCueProgress = nextCue
    ? clampPercentage(
        ((currentMs - nextCueProgressStartMs) / nextCueProgressTotalMs) * 100,
      )
    : 100;
  const lyricRemainingMs = currentCue
    ? Math.max(0, currentCue.endMs - currentMs)
    : nextCueCountdownMs;
  const targetLength = currentCue?.targetText.length ?? 0;
  const typedCount = currentCue ? Math.min(input.length, targetLength) : 0;
  const correctTypedCount = currentCue ? matchingPrefix : 0;
  const wrongTypedCount = Math.max(0, typedCount - correctTypedCount);
  const remainingTypedCount = currentCue
    ? Math.max(0, targetLength - typedCount)
    : 0;
  const correctProgress = targetLength
    ? (correctTypedCount / targetLength) * 100
    : 0;
  const wrongProgress = targetLength
    ? (wrongTypedCount / targetLength) * 100
    : 0;

  useEffect(() => {
    if (!currentCue) {
      setCurrentCueIndex(null);
      setInput("");
      return;
    }

    if (currentCue.index === currentCueIndex) {
      return;
    }

    setCurrentCueIndex(currentCue.index);
    setInput("");
  }, [currentCue, currentCueIndex]);

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    function createPlayer() {
      if (!window.YT || playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player("typing-youtube-player", {
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            setIsReady(true);
          },
        },
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        videoId: youtubeId,
      });
    }

    if (window.YT) {
      createPlayer();
    } else {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        createPlayer();
      };

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;

      if (!player) {
        return;
      }

      setCurrentMs(Math.round(player.getCurrentTime() * 1000));
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  const completeCue = useCallback(
    (cue: TypingCue) => {
      if (completedCueIndexes.current.has(cue.index)) {
        return;
      }

      completedCueIndexes.current.add(cue.index);
      const bonus = Math.max(1, combo + 1);
      setScore((current) => current + cue.targetText.length * 10 * bonus);
      setCombo((current) => current + 1);
    },
    [combo],
  );

  const handleInput = useCallback(
    (nextInput: string, typedCharacter = "") => {
      if (!currentCue) {
        return;
      }

      const trimmedInput = nextInput.slice(0, currentCue.targetText.length);
      const nextMatchingPrefix = countMatchingPrefix(
        currentCue.targetText,
        trimmedInput,
      );
      const isNewCharacterWrong =
        typedCharacter.length > 0 &&
        typedCharacter !== currentCue.targetText[input.length];

      setInput(trimmedInput);
      setTypedChars(
        (current) => current + Math.max(0, trimmedInput.length - input.length),
      );
      setCorrectChars((current) => {
        const previousMatchingPrefix = countMatchingPrefix(
          currentCue.targetText,
          input,
        );

        return (
          current + Math.max(0, nextMatchingPrefix - previousMatchingPrefix)
        );
      });

      if (isNewCharacterWrong) {
        setCombo(0);
      }

      if (trimmedInput === currentCue.targetText) {
        completeCue(currentCue);
      }
    },
    [completeCue, currentCue, input],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!currentCue || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setInput((current) => current.slice(0, -1));
        return;
      }

      if (
        event.key.length !== 1 ||
        input.length >= currentCue.targetText.length
      ) {
        return;
      }

      const character = normalizeInputCharacter(event.key);

      if (!character) {
        return;
      }

      event.preventDefault();
      handleInput(`${input}${character}`, character);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCue, handleInput, input]);

  function togglePlayback() {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
      return;
    }

    player.playVideo();
    setIsPlaying(true);
  }

  function restart() {
    completedCueIndexes.current = new Set();
    setInput("");
    setScore(0);
    setCombo(0);
    setCorrectChars(0);
    setTypedChars(0);
    setCurrentMs(0);
    setCurrentCueIndex(null);
    playerRef.current?.seekTo(0, true);
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="meta flex items-center gap-2">
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Typing game
          </div>
          <Link className="btn-outline gap-2" href={selectHref}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Select song
          </Link>
        </div>

        <div className="space-y-3 border-[3px] border-ink bg-yellow p-5 text-block shadow-[8px_8px_0_rgb(var(--shadow))]">
          <h1 className="max-w-5xl text-balance">{title}</h1>
          <div className="flex flex-wrap gap-3">
            <ModeBadge label="Language" value={formatGameLang(lang)} />
            <ModeBadge label="Difficulty" value={difficulty.toUpperCase()} />
          </div>
        </div>
      </header>

      <div className="overflow-hidden border-[3px] border-ink bg-block shadow-[10px_10px_0_rgb(var(--shadow))]">
        <div className="aspect-video w-full">
          <div id="typing-youtube-player" className="h-full w-full" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CountdownMeter
          label={formatCountdown(nextCueCountdownMs)}
          progress={nextCueProgress}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={!isReady}
            className="btn-primary gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={restart} className="btn-outline gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restart
          </button>
        </div>
      </div>

      <div className="border-[3px] border-ink bg-paper p-5 shadow-[10px_10px_0_rgb(var(--shadow))]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="meta">Lyric {currentCue?.index ?? "-"}</div>
          <div className="meta">
            Remaining {formatSeconds(lyricRemainingMs)}
          </div>
        </div>

        <div className="space-y-5">
          <div className="min-h-40 whitespace-pre-wrap break-words border-[3px] border-ink bg-paper p-5 text-3xl font-black uppercase leading-tight text-ink shadow-[5px_5px_0_rgb(var(--shadow))] md:text-4xl">
            {currentCue
              ? Array.from(currentCue.displayText.toLocaleUpperCase()).map(
                  (char, index) => {
                    const state = getDisplayCharacterState(
                      currentCue,
                      index,
                      input,
                    );

                    return (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: Display text is stable for the active cue.
                        key={`${char}-${index}`}
                        className={
                          state === "correct"
                            ? "bg-yellow text-block"
                            : state === "wrong"
                              ? "bg-red text-relief"
                              : state === "active"
                                ? "border-b-[0.18em] border-red text-ink"
                                : state === "pending"
                                  ? "text-ink"
                                  : "text-ink opacity-60"
                        }
                      >
                        {char}
                      </span>
                    );
                  },
                )
              : null}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="meta">
                Typed {typedCount}/{targetLength}
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.12em]">
                <span className="text-red">Correct {correctTypedCount}</span>
                <span className="text-block">Wrong {wrongTypedCount}</span>
                <span className="text-ink">Left {remainingTypedCount}</span>
              </div>
            </div>
            <div className="flex h-5 overflow-hidden border-2 border-ink bg-paper">
              <div
                className="h-full bg-red transition-[width]"
                style={{ width: `${correctProgress}%` }}
              />
              <div
                className="h-full bg-block transition-[width]"
                style={{ width: `${wrongProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Score" value={score.toLocaleString()} />
        <Stat label="Combo" value={`${combo}x`} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
      </div>
    </section>
  );
}

function ModeBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-ink bg-paper px-3 py-2 shadow-[4px_4px_0_rgb(var(--shadow))]">
      <span className="mr-2 text-xs font-black uppercase tracking-[0.12em] text-red">
        {label}
      </span>
      <span className="font-black uppercase tracking-[0.08em]">{value}</span>
    </div>
  );
}

function CountdownMeter({
  label,
  progress,
}: {
  label: string;
  progress: number;
}) {
  return (
    <div className="min-w-64 flex-1 border-[3px] border-ink bg-yellow p-3 text-block shadow-[5px_5px_0_rgb(var(--shadow))]">
      <div className="mb-2 text-xl font-black uppercase leading-none md:text-2xl">
        {label}
      </div>
      <div className="h-5 border-2 border-ink bg-paper">
        <div
          className="h-full bg-red transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-ink bg-paper p-4 shadow-[5px_5px_0_rgb(var(--shadow))]">
      <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-red">
        {label}
      </div>
      <div className="break-words text-3xl font-black leading-none">
        {value}
      </div>
    </div>
  );
}
