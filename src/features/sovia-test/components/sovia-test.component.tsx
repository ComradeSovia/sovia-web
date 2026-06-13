"use client";

import { Routes } from "@sovia/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDefaultSoviaTestCopy } from "../i18n/copy";
import { useSoviaTestI18n } from "../i18n/use-sovia-test-i18n";
import { getSoviaLetterColor } from "../lib/letter-colors";
import type {
  ArchetypeCopy,
  AxisKey,
  SoviaLetter,
  SoviaTestAgeGroup,
  SoviaTestCopy,
  SoviaTestGender,
} from "../types";
import { SOVIA_TEST_AGE_GROUPS, SOVIA_TEST_GENDER_OPTIONS } from "../types";
import { SoviaCode } from "./sovia-code.component";
import { SoviaTestLanguageSwitcher } from "./sovia-test-language-switcher.component";

const defaultCopy = getDefaultSoviaTestCopy();

const AXIS_ORDER: AxisKey[] = [
  "structure",
  "action",
  "influence",
  "understanding",
  "relation",
];

const AXIS_DEFINITIONS = {
  structure: {
    positive: "S",
    negative: "F",
    fallback: "S",
  },
  action: {
    positive: "O",
    negative: "E",
    fallback: "E",
  },
  influence: {
    positive: "V",
    negative: "Q",
    fallback: "V",
  },
  understanding: {
    positive: "I",
    negative: "M",
    fallback: "I",
  },
  relation: {
    positive: "A",
    negative: "L",
    fallback: "A",
  },
} as const satisfies Record<
  AxisKey,
  {
    positive: SoviaLetter;
    negative: SoviaLetter;
    fallback: SoviaLetter;
  }
>;

const QUESTIONS_PER_PAGE = 5;
const MOBILE_ANSWER_OPTIONS = [
  { label: 1, value: 0 },
  { label: 2, value: 3 },
  { label: 3, value: 5 },
  { label: 4, value: 8 },
  { label: 5, value: 10 },
] as const;
const VISITOR_ID_STORAGE_KEY = "sovia-test-visitor";
const VISITOR_ID_TTL_MS = 60 * 60 * 1000;

type TestScreen = "intro" | "quiz" | "demographics" | "result";

type Scores = Record<AxisKey, number>;
type StoredVisitor = {
  id: string;
  expiresAt: number;
};

const HASH_ALPHABET = "k7qz4vnr9x2mpt6c8bd5jwy3hfgs";
const HASH_KEY = [3, 1, 4, 1, 5, 2, 4, 3, 5, 1];
const SCORE_OFFSET = 200;
const SCORE_SCALE = 5;
const SCORE_HASH_CHUNK_SIZE = 2;

type SoviaTestComponentProps = {
  initialHash?: string;
  initialResultType?: string;
};

type AnswerValue = number | null;

function createEmptyAnswers() {
  return Array.from({ length: defaultCopy.questions.length }, () => null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStoredVisitor(value: unknown): value is StoredVisitor {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.expiresAt === "number" &&
    Number.isFinite(value.expiresAt)
  );
}

function createVisitorId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${random}`;
}

function getVisitorId() {
  const now = Date.now();

  try {
    const storedValue = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    const stored: unknown = storedValue ? JSON.parse(storedValue) : null;

    if (isStoredVisitor(stored) && stored.expiresAt > now) {
      return stored.id;
    }
  } catch {
    // Fall through and create a fresh visitor for this submission.
  }

  const nextVisitor: StoredVisitor = {
    id: createVisitorId(),
    expiresAt: now + VISITOR_ID_TTL_MS,
  };

  try {
    window.localStorage.setItem(
      VISITOR_ID_STORAGE_KEY,
      JSON.stringify(nextVisitor),
    );
  } catch {
    // Submitting should still work even when storage is unavailable.
  }

  return nextVisitor.id;
}

function encodeAnswerToken(answer: number, index: number) {
  const encoded = (answer + HASH_KEY[index % HASH_KEY.length]) % 11;
  return HASH_ALPHABET[(encoded + index * 7) % HASH_ALPHABET.length];
}

function decodeAnswers(value: string | null) {
  if (!value || value.length !== defaultCopy.questions.length + 1) {
    return null;
  }

  const body = value.slice(0, defaultCopy.questions.length);
  const checksum = value.at(-1);
  const answers = body.split("").map((token, index) => {
    for (let answer = 0; answer <= 10; answer += 1) {
      if (encodeAnswerToken(answer, index) === token) {
        return answer;
      }
    }

    return -1;
  });

  if (
    answers.some(
      (answer) => !Number.isInteger(answer) || answer < 0 || answer > 10,
    )
  ) {
    return null;
  }

  const expectedChecksum = answers.reduce(
    (total, answer, index) => total + answer * (index + 3),
    0,
  );

  if (checksum !== HASH_ALPHABET[expectedChecksum % HASH_ALPHABET.length]) {
    return null;
  }

  return answers;
}

function createInitialScores(): Scores {
  return {
    structure: 0,
    action: 0,
    influence: 0,
    understanding: 0,
    relation: 0,
  };
}

function encodeScoreValue(score: number, index: number) {
  const value = Math.round(score * SCORE_SCALE) + SCORE_OFFSET;
  const shifted = value + HASH_KEY[index % HASH_KEY.length];
  const high = Math.floor(shifted / HASH_ALPHABET.length);
  const low = shifted % HASH_ALPHABET.length;

  return `${HASH_ALPHABET[high]}${HASH_ALPHABET[low]}`;
}

function decodeScoreValue(value: string, index: number) {
  const high = HASH_ALPHABET.indexOf(value[0] ?? "");
  const low = HASH_ALPHABET.indexOf(value[1] ?? "");

  if (high < 0 || low < 0) {
    return null;
  }

  const shifted = high * HASH_ALPHABET.length + low;
  return (
    (shifted - HASH_KEY[index % HASH_KEY.length] - SCORE_OFFSET) / SCORE_SCALE
  );
}

function encodeScores(scores: Scores) {
  const values = AXIS_ORDER.map((axis) => scores[axis]);
  const body = values
    .map((score, index) => encodeScoreValue(score, index))
    .join("");
  const checksum = values.reduce(
    (total, score, index) =>
      total + (Math.round(score * SCORE_SCALE) + SCORE_OFFSET) * (index + 3),
    0,
  );

  return `${body}${HASH_ALPHABET[checksum % HASH_ALPHABET.length]}`;
}

function decodeScores(value: string | null) {
  const expectedLength = AXIS_ORDER.length * SCORE_HASH_CHUNK_SIZE + 1;

  if (!value || value.length !== expectedLength) {
    return null;
  }

  const scores = createInitialScores();
  const values: number[] = [];

  for (const [index, axis] of AXIS_ORDER.entries()) {
    const start = index * SCORE_HASH_CHUNK_SIZE;
    const score = decodeScoreValue(
      value.slice(start, start + SCORE_HASH_CHUNK_SIZE),
      index,
    );

    if (score === null) {
      return null;
    }

    scores[axis] = score;
    values.push(score);
  }

  const checksum = values.reduce((total, score, index) => {
    return (
      total + (Math.round(score * SCORE_SCALE) + SCORE_OFFSET) * (index + 3)
    );
  }, 0);

  if (value.at(-1) !== HASH_ALPHABET[checksum % HASH_ALPHABET.length]) {
    return null;
  }

  return scores;
}

function getAxisLetters(axis: AxisKey): [SoviaLetter, SoviaLetter] {
  const definition = AXIS_DEFINITIONS[axis];
  return [definition.positive, definition.negative];
}

function formatText(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function calculateScores(answers: AnswerValue[]) {
  const scores = createInitialScores();

  answers.forEach((answer, index) => {
    const question = defaultCopy.questions[index];
    if (!question || answer === null) return;

    const agreement = (answer - 5) / 5;

    question.scores.forEach(({ axis, weight }) => {
      scores[axis] += weight * agreement;
    });
  });

  return scores;
}

function calculateCode(scores: Scores) {
  return AXIS_ORDER.map((axis) => {
    const score = scores[axis];
    const definition = AXIS_DEFINITIONS[axis];

    if (score === 0) {
      return definition.fallback;
    }

    return score > 0 ? definition.positive : definition.negative;
  }).join("");
}

function getAxisRange(axis: AxisKey) {
  return defaultCopy.questions.reduce(
    (range, question) => {
      question.scores
        .filter((score) => score.axis === axis)
        .forEach((score) => {
          const absoluteWeight = Math.abs(score.weight);
          range.maximum += absoluteWeight;
          range.minimum -= absoluteWeight;
        });

      return range;
    },
    { maximum: 0, minimum: 0 },
  );
}

function calculatePercentages(axis: AxisKey, axisScore: number) {
  const range = getAxisRange(axis);
  const span = range.maximum - range.minimum;
  const normalizedScore = span > 0 ? (axisScore - range.minimum) / span : 0.5;
  const positive = Math.round(normalizedScore * 100);

  return {
    positive: Math.min(100, Math.max(0, positive)),
    negative: Math.min(100, Math.max(0, 100 - positive)),
  };
}

function getSoviaSidePercentage(axis: AxisKey, axisScore: number) {
  return calculatePercentages(axis, axisScore).positive;
}

function getAxisSummary(
  axis: AxisKey,
  scores: Scores,
  activeCopy: SoviaTestCopy,
) {
  const [positive, negative] = getAxisLetters(axis);
  const axisScore = scores[axis];
  const percentages = calculatePercentages(axis, axisScore);
  const definition = AXIS_DEFINITIONS[axis];
  const winner =
    axisScore === 0 ? definition.fallback : axisScore > 0 ? positive : negative;
  const loser = winner === positive ? negative : positive;
  const winnerPercentage =
    winner === positive ? percentages.positive : percentages.negative;
  const loserPercentage =
    loser === positive ? percentages.positive : percentages.negative;

  return {
    axis,
    axisScore,
    loser,
    loserPercentage,
    oppositeLetter: activeCopy.axes[axis].letters[loser],
    winner,
    winnerPercentage,
    letter: activeCopy.axes[axis].letters[winner],
  };
}

function getFallbackArchetype(
  code: string,
  activeCopy: SoviaTestCopy,
): ArchetypeCopy {
  return {
    title: formatText(activeCopy.fallback.archetypeTitleFormat, {
      name: code,
    }),
    description: activeCopy.fallback.archetypeDescription,
    unit: activeCopy.fallback.unit,
    archiveComment: activeCopy.fallback.archiveComment,
    soviaComment: activeCopy.fallback.soviaComment,
  };
}

function getResult(answers: AnswerValue[], activeCopy: SoviaTestCopy) {
  const scores = calculateScores(answers);
  const code = calculateCode(scores);
  const archetype =
    activeCopy.types[code] ?? getFallbackArchetype(code, activeCopy);

  return {
    scores,
    code,
    archetype,
  };
}

function getScoresResult(scores: Scores, activeCopy: SoviaTestCopy) {
  const code = calculateCode(scores);

  return {
    scores,
    code,
    archetype: activeCopy.types[code] ?? getFallbackArchetype(code, activeCopy),
  };
}

type SoviaAxisStarProps = {
  copy: SoviaTestCopy;
  scores: Scores;
};

function SoviaAxisStar({ copy, scores }: SoviaAxisStarProps) {
  const summaries = AXIS_ORDER.map((axis) =>
    getAxisSummary(axis, scores, copy),
  );
  const center = 150;
  const outerRadius = 106;
  const innerRadius = 45;
  const dataBaseRadius = 34;
  const dataRadiusRange = 76;
  const labelRadius = 126;

  function point(angle: number, radius: number) {
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  }

  function pointText({ x, y }: { x: number; y: number }) {
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }

  const angles = summaries.map((_, index) => {
    return ((-90 + index * 72) * Math.PI) / 180;
  });
  const starPoints = summaries.flatMap((_, index) => {
    const outerPoint = point(angles[index] ?? 0, outerRadius);
    const innerPoint = point(((-54 + index * 72) * Math.PI) / 180, innerRadius);

    return [pointText(outerPoint), pointText(innerPoint)];
  });
  const dataPoints = summaries.map((summary, index) => {
    const soviaSidePercentage = getSoviaSidePercentage(
      summary.axis,
      summary.axisScore,
    );
    const radius =
      dataBaseRadius + (soviaSidePercentage / 100) * dataRadiusRange;
    return pointText(point(angles[index] ?? 0, radius));
  });

  return (
    <div className="border-[3px] border-ink bg-paper p-4 shadow-[8px_8px_0_rgb(var(--shadow))]">
      <div className="meta">{copy.certificate.axisLabel}</div>
      <svg
        aria-label={copy.certificate.axisLabel}
        className="mt-3 h-auto w-full"
        role="img"
        viewBox="0 0 300 300"
      >
        <title>{copy.certificate.axisLabel}</title>
        <polygon
          fill="rgb(var(--red))"
          opacity="0.14"
          points={starPoints.join(" ")}
          stroke="rgb(var(--ink))"
          strokeWidth="3"
        />
        {angles.map((angle, index) => {
          const lineEnd = point(angle, outerRadius);
          return (
            <line
              key={summaries[index]?.axis}
              stroke="rgb(var(--ink))"
              strokeDasharray="5 7"
              strokeWidth="2"
              x1={center}
              x2={lineEnd.x}
              y1={center}
              y2={lineEnd.y}
            />
          );
        })}
        <polygon
          fill="rgb(var(--red))"
          opacity="0.55"
          points={dataPoints.join(" ")}
          stroke="rgb(var(--red))"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <circle
          cx={center}
          cy={center}
          fill="rgb(var(--paper))"
          r="8"
          stroke="rgb(var(--ink))"
          strokeWidth="3"
        />
        {summaries.map((summary, index) => {
          const angle = angles[index] ?? 0;
          const [soviaLetter] = getAxisLetters(summary.axis);
          const soviaSidePercentage = getSoviaSidePercentage(
            summary.axis,
            summary.axisScore,
          );
          const dotRadius =
            dataBaseRadius + (soviaSidePercentage / 100) * dataRadiusRange;
          const dot = point(angle, dotRadius);
          const label = point(angle, labelRadius);
          const anchor =
            label.x < center - 12
              ? "end"
              : label.x > center + 12
                ? "start"
                : "middle";

          return (
            <g key={summary.axis}>
              <circle
                cx={dot.x}
                cy={dot.y}
                fill="rgb(var(--yellow))"
                r="7"
                stroke="rgb(var(--ink))"
                strokeWidth="3"
              />
              <text
                fill="rgb(var(--ink))"
                fontSize="18"
                fontWeight="900"
                textAnchor={anchor}
                x={label.x}
                y={label.y}
              >
                {soviaLetter}
              </text>
              <text
                fill="rgb(var(--red))"
                fontSize="10"
                fontWeight="900"
                textAnchor={anchor}
                x={label.x}
                y={label.y + 14}
              >
                {soviaSidePercentage}%
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 grid gap-2">
        {summaries.map((summary) => {
          const [soviaLetter] = getAxisLetters(summary.axis);
          const soviaSidePercentage = getSoviaSidePercentage(
            summary.axis,
            summary.axisScore,
          );

          return (
            <div
              className="flex items-center justify-between gap-3 border-[2px] border-ink bg-relief px-3 py-2 text-xs font-black"
              key={summary.axis}
            >
              <span className="min-w-0 break-words">
                {copy.axes[summary.axis].label}
              </span>
              <span className="shrink-0 text-red">
                {soviaLetter} / {soviaSidePercentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SoviaTestComponent({
  initialHash,
  initialResultType,
}: SoviaTestComponentProps = {}) {
  const router = useRouter();
  const { copy, locale, locales, setLocale } = useSoviaTestI18n();

  const [answers, setAnswers] = useState<AnswerValue[]>(createEmptyAnswers);
  const [sharedScores, setSharedScores] = useState<Scores | null>(null);
  const [ageGroup, setAgeGroup] =
    useState<SoviaTestAgeGroup>("prefer_not_to_say");
  const [gender, setGender] = useState<SoviaTestGender>("prefer_not_to_say");
  const [screen, setScreen] = useState<TestScreen>("intro");
  const [currentPage, setCurrentPage] = useState(0);
  const [status, setStatus] = useState(copy.status.ready);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const questionRefs = useRef(new Map<number, HTMLDivElement>());
  const quizActionsRef = useRef<HTMLDivElement>(null);
  const pendingQuestionFocusRef = useRef<number | null>(null);

  const result = useMemo(() => {
    if (sharedScores) {
      return getScoresResult(sharedScores, copy);
    }

    return getResult(answers, copy);
  }, [answers, copy, sharedScores]);
  const resultEssay = copy.typeEssays[result.code];
  const totalPages = Math.ceil(
    defaultCopy.questions.length / QUESTIONS_PER_PAGE,
  );
  const pageStart = currentPage * QUESTIONS_PER_PAGE;
  const pageQuestions = copy.questions.slice(
    pageStart,
    pageStart + QUESTIONS_PER_PAGE,
  );
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const allAnswered = answeredCount === defaultCopy.questions.length;
  const currentPageAnswered = pageQuestions.every((_, index) => {
    return answers[pageStart + index] !== null;
  });
  const quizStatus = currentPageAnswered
    ? copy.status.ready
    : copy.status.unanswered;

  useEffect(() => {
    setResultUrl(window.location.href);

    const sharedScores = decodeScores(initialHash ?? null);
    const sharedAnswers = decodeAnswers(initialHash ?? null);
    const normalizedType = initialResultType?.toUpperCase();
    const hasSharedType = normalizedType
      ? Object.hasOwn(defaultCopy.types, normalizedType)
      : false;

    if (sharedScores) {
      const sharedResult = getScoresResult(sharedScores, copy);
      const sharedType = sharedResult.code.toLowerCase();
      const sharedHash = encodeScores(sharedScores);
      const sharedPath = `/test/result/${sharedType}/${sharedHash}`;

      setAnswers(createEmptyAnswers());
      setSharedScores(sharedScores);
      setScreen("result");
      setCurrentPage(0);
      setStatus(copy.status.ready);
      setResultUrl(`${window.location.origin}${sharedPath}`);

      if (initialResultType?.toLowerCase() !== sharedType) {
        router.replace(sharedPath, { scroll: false });
      }

      return;
    }

    if (!sharedAnswers) {
      if (hasSharedType && normalizedType) {
        router.replace(`/test/types/${normalizedType.toLowerCase()}`, {
          scroll: false,
        });
      }

      return;
    }

    const sharedResult = getResult(sharedAnswers, copy);
    const sharedType = sharedResult.code.toLowerCase();
    const sharedHash = encodeScores(sharedResult.scores);
    const sharedPath = `/test/result/${sharedType}/${sharedHash}`;

    setAnswers(sharedAnswers);
    setSharedScores(sharedResult.scores);
    setScreen("result");
    setCurrentPage(0);
    setStatus(copy.status.ready);
    setResultUrl(`${window.location.origin}${sharedPath}`);

    if (initialResultType?.toLowerCase() !== sharedType) {
      router.replace(sharedPath, { scroll: false });
    }
  }, [copy, initialHash, initialResultType, router]);

  useEffect(() => {
    if (screen !== "quiz") {
      return;
    }

    window.requestAnimationFrame(() => {
      const pendingQuestionFocus = pendingQuestionFocusRef.current;
      const focusIndex =
        pendingQuestionFocus !== null &&
        pendingQuestionFocus >= pageStart &&
        pendingQuestionFocus < pageStart + QUESTIONS_PER_PAGE
          ? pendingQuestionFocus
          : pageStart;
      pendingQuestionFocusRef.current = null;
      const element = questionRefs.current.get(focusIndex);

      if (!element) {
        return;
      }

      element.focus({ preventScroll: true });
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [pageStart, screen]);

  function focusElement(element: HTMLElement | null) {
    if (!element) {
      return;
    }

    element.focus({ preventScroll: true });
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function focusQuestion(questionIndex: number) {
    focusElement(questionRefs.current.get(questionIndex) ?? null);
  }

  function setAnswer(questionIndex: number, value: number) {
    setSharedScores(null);
    setAnswers((current) =>
      current.map(
        (answer, index): AnswerValue =>
          index === questionIndex ? value : answer,
      ),
    );
    window.requestAnimationFrame(() => {
      const nextQuestionIndex = questionIndex + 1;
      const nextQuestionIsVisible =
        nextQuestionIndex < pageStart + pageQuestions.length &&
        nextQuestionIndex < defaultCopy.questions.length;

      if (nextQuestionIsVisible) {
        focusQuestion(nextQuestionIndex);
        return;
      }

      focusElement(quizActionsRef.current);
    });
  }

  function start() {
    setSharedScores(null);
    setScreen("quiz");
    setCurrentPage(0);
    setStatus(copy.status.ready);
  }

  function goPrevious() {
    setCurrentPage((page) => Math.max(0, page - 1));
    setStatus(copy.status.ready);
  }

  function goNextPage() {
    if (!currentPageAnswered) {
      const firstUnansweredOnPage = answers.findIndex((answer, index) => {
        return (
          index >= pageStart &&
          index < pageStart + pageQuestions.length &&
          answer === null
        );
      });

      focusQuestion(
        firstUnansweredOnPage >= 0 ? firstUnansweredOnPage : pageStart,
      );
      return;
    }

    setCurrentPage((page) => Math.min(totalPages - 1, page + 1));
    setStatus(copy.status.ready);
  }

  function goDemographics() {
    if (!currentPageAnswered || !allAnswered) {
      const firstUnanswered = answers.indexOf(null);
      pendingQuestionFocusRef.current = firstUnanswered;
      setCurrentPage(
        Math.max(0, Math.floor(firstUnanswered / QUESTIONS_PER_PAGE)),
      );
      window.requestAnimationFrame(() => {
        focusQuestion(firstUnanswered);
      });
      return;
    }

    setScreen("demographics");
    setStatus(copy.status.ready);
  }

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const completedAnswers = answers.filter(
      (answer): answer is number => answer !== null,
    );
    const completedResult = getResult(completedAnswers, copy);
    const hash = encodeScores(completedResult.scores);
    const nextPath = `/test/result/${completedResult.code.toLowerCase()}/${hash}`;

    setIsSubmitting(true);

    try {
      const visitorId = getVisitorId();

      await fetch("/api/sovia-test/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitorId,
          resultCode: completedResult.code,
          resultHash: hash,
          locale,
          ageGroup,
          gender,
          scores: completedResult.scores,
        }),
      });
    } catch (error) {
      console.warn("Failed to save SOVIA test submission.", error);
    }

    setResultUrl(`${window.location.origin}${nextPath}`);
    router.replace(nextPath, { scroll: false });
    setSharedScores(completedResult.scores);
    setScreen("result");
  }

  function restart() {
    setAnswers(createEmptyAnswers());
    setSharedScores(null);
    setIsSubmitting(false);
    setCurrentPage(0);
    setScreen("intro");
    setStatus(copy.status.ready);
    router.replace("/test", { scroll: false });
  }

  async function copyResult() {
    const url = resultUrl || window.location.href;
    const text = formatText(copy.copy.template, {
      code: result.code,
      title: result.archetype.title,
      unit: result.archetype.unit,
      url,
    });

    try {
      await navigator.clipboard.writeText(text);
      setStatus(copy.copy.success);
    } catch {
      setStatus(copy.copy.failed);
    }
  }

  async function copyResultLink() {
    try {
      await navigator.clipboard.writeText(resultUrl);
      setStatus(copy.copy.linkSuccess);
    } catch {
      setStatus(copy.copy.failed);
    }
  }

  if (screen === "intro") {
    return (
      <section className="sovia-test-ui space-y-8">
        <SoviaTestLanguageSwitcher
          copy={copy}
          locale={locale}
          locales={locales}
          onLocaleChange={setLocale}
        />
        <div className="manifesto grid gap-8 md:grid-cols-[16rem_1fr]">
          <div className="space-y-4">
            <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
              {copy.progress.label}
            </div>
            <div className="bg-block p-5 text-[clamp(2.25rem,5vw,3.5rem)] font-black leading-none text-relief">
              {formatText(copy.progress.format, {
                current: 0,
                total: copy.questions.length,
              })}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="meta">{copy.page.eyebrow}</div>
              <h1 className="sovia-page-title mt-3">{copy.page.title}</h1>
              <div className="meta mt-3">{copy.page.subtitle}</div>
            </div>
            <p className="text-base font-medium leading-relaxed">
              {copy.page.intro}
            </p>
            <p className="text-sm font-medium leading-relaxed">
              {copy.page.disclaimer}
            </p>
            <div className="flex flex-wrap gap-5">
              <button className="btn-primary" onClick={start} type="button">
                {copy.actions.start}
              </button>
              <a className="btn-outline" href="/test/types">
                {copy.actions.types}
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (screen === "demographics") {
    return (
      <section className="sovia-test-ui space-y-6">
        <SoviaTestLanguageSwitcher
          copy={copy}
          locale={locale}
          locales={locales}
          onLocaleChange={setLocale}
        />

        <div className="card space-y-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <div className="meta">{copy.system.name}</div>
              <h1 className="sovia-demographics-title mt-2">
                {copy.demographics.title}
              </h1>
              <p className="mt-3 text-sm font-medium leading-relaxed">
                {copy.demographics.intro}
              </p>
            </div>
            <div className="w-fit border-[3px] border-ink bg-paper px-4 py-3 text-2xl font-black leading-none text-ink shadow-[5px_5px_0_rgb(var(--shadow))]">
              <SoviaCode code={result.code} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid min-w-0 gap-3">
              <span className="meta">{copy.demographics.ageLabel}</span>
              <select
                className="w-full min-w-0 border-[3px] border-ink bg-paper px-3 py-3 font-black text-ink shadow-[5px_5px_0_rgb(var(--shadow))]"
                onChange={(event) =>
                  setAgeGroup(event.target.value as SoviaTestAgeGroup)
                }
                value={ageGroup}
              >
                {SOVIA_TEST_AGE_GROUPS.map((option) => (
                  <option key={option} value={option}>
                    {copy.demographics.ageOptions[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-3">
              <span className="meta">{copy.demographics.genderLabel}</span>
              <select
                className="w-full min-w-0 border-[3px] border-ink bg-paper px-3 py-3 font-black text-ink shadow-[5px_5px_0_rgb(var(--shadow))]"
                onChange={(event) =>
                  setGender(event.target.value as SoviaTestGender)
                }
                value={gender}
              >
                {SOVIA_TEST_GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {copy.demographics.genderOptions[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5">
          <button
            className="btn-outline"
            onClick={() => setScreen("quiz")}
            type="button"
          >
            {copy.actions.previous}
          </button>
          <button
            className="btn-primary"
            disabled={isSubmitting}
            onClick={submit}
            type="button"
          >
            {copy.actions.submit}
          </button>
        </div>
      </section>
    );
  }

  if (screen === "result") {
    return (
      <section className="sovia-test-ui space-y-8">
        <SoviaTestLanguageSwitcher
          copy={copy}
          locale={locale}
          locales={locales}
          onLocaleChange={setLocale}
        />
        <div className="manifesto grid gap-8 md:grid-cols-[16rem_1fr]">
          <div className="space-y-4">
            <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
              {copy.system.name}
            </div>
            <div className="bg-block p-5 text-[clamp(2.25rem,5vw,3.5rem)] font-black leading-none text-relief">
              <SoviaCode
                code={result.code}
                template={copy.certificate.codeFormat}
              />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="meta">{copy.certificate.title}</div>
              <h1 className="sovia-result-title mt-3">
                {result.archetype.title}
              </h1>
            </div>

            <div className="space-y-2">
              <div className="meta">{copy.certificate.descriptionLabel}</div>
              <p className="text-base font-medium leading-relaxed">
                {result.archetype.description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card space-y-4">
            <div className="meta">{copy.certificate.systemLabel}</div>
            <p>{copy.system.name}</p>

            <div className="meta">{copy.certificate.statusLabel}</div>
            <p>{copy.certificate.statusApproved}</p>

            <div className="meta">{copy.certificate.codeLabel}</div>
            <div className="text-4xl font-black text-ink">
              <SoviaCode
                code={result.code}
                template={copy.certificate.codeFormat}
              />
            </div>

            <div className="meta">{copy.certificate.titleLabel}</div>
            <p>{result.archetype.title}</p>

            <div className="meta">{copy.certificate.unitLabel}</div>
            <p>{result.archetype.unit}</p>
          </div>

          <div className="card space-y-4">
            <div className="meta">{copy.certificate.archiveCommentLabel}</div>
            <p>{result.archetype.archiveComment}</p>

            <div className="meta">{copy.certificate.soviaCommentLabel}</div>
            <p>{result.archetype.soviaComment}</p>

            <div className="meta">{copy.certificate.authorityLabel}</div>
            <p>{copy.certificate.authority}</p>
          </div>
        </div>

        {resultEssay && (
          <div className="card space-y-5 bg-[rgb(var(--paper))]/90">
            <div>
              <div className="meta">{copy.details.title}</div>
              <h2 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)]">
                {result.archetype.title}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <section className="space-y-2 border-[2px] border-ink bg-paper p-4">
                <div className="meta">{copy.details.personalityLabel}</div>
                <p className="text-sm leading-relaxed">
                  {resultEssay.personality}
                </p>
              </section>

              <section className="space-y-2 border-[2px] border-ink bg-paper p-4">
                <div className="meta">{copy.details.workLabel}</div>
                <p className="text-sm leading-relaxed">{resultEssay.work}</p>
              </section>

              <section className="space-y-2 border-[2px] border-ink bg-paper p-4">
                <div className="meta">{copy.details.socialLabel}</div>
                <p className="text-sm leading-relaxed">{resultEssay.social}</p>
              </section>
            </div>
          </div>
        )}

        <div className="card space-y-4">
          <div className="meta">{copy.certificate.resultLinkLabel}</div>
          <input
            className="w-full border-[3px] border-ink bg-paper px-4 py-3 font-black text-ink shadow-[6px_6px_0_rgb(var(--red))]"
            readOnly
            value={resultUrl}
          />
          <button
            className="btn-primary"
            onClick={copyResultLink}
            type="button"
          >
            {copy.actions.copyLink}
          </button>
        </div>

        <div className="card space-y-5">
          <div className="meta">{copy.certificate.assessmentLabel}</div>
          <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
            <SoviaAxisStar copy={copy} scores={result.scores} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {AXIS_ORDER.map((axis) => {
                const summary = getAxisSummary(axis, result.scores, copy);

                return (
                  <div
                    className="border-[3px] border-ink bg-paper p-4"
                    key={axis}
                  >
                    <div className="meta break-words">
                      {copy.axes[axis].label}
                    </div>
                    <div
                      className="mt-2 text-3xl font-black"
                      style={{ color: getSoviaLetterColor(summary.winner) }}
                    >
                      {summary.winner}
                    </div>
                    <div
                      className="font-black"
                      style={{ color: getSoviaLetterColor(summary.winner) }}
                    >
                      {summary.letter.zhName}
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs font-black uppercase leading-tight tracking-[0.04em] text-ink">
                        <span>{copy.certificate.tendencyLabel}</span>
                        <span>{summary.winnerPercentage}%</span>
                      </div>
                      <div className="h-4 border-[3px] border-ink bg-paper">
                        <div
                          className="h-full bg-red"
                          style={{ width: `${summary.winnerPercentage}%` }}
                        />
                      </div>
                      <div
                        className="flex items-center justify-between gap-3 text-[11px] font-black uppercase leading-tight tracking-[0.04em]"
                        style={{ color: getSoviaLetterColor(summary.loser) }}
                      >
                        <span>
                          {copy.certificate.oppositeLabel}:{" "}
                          {summary.oppositeLetter.zhName}
                        </span>
                        <span>{summary.loserPercentage}%</span>
                      </div>
                      <div className="text-[11px] font-black uppercase leading-tight tracking-[0.04em] text-ink">
                        {copy.certificate.rawScoreLabel}:{" "}
                        {summary.axisScore.toFixed(2)}
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{summary.letter.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          <button className="btn-primary" onClick={copyResult} type="button">
            {copy.actions.copy}
          </button>
          <button className="btn-outline" onClick={restart} type="button">
            {copy.actions.restart}
          </button>
        </div>

        <div className="card grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="meta">{copy.channelAd.title}</div>
            <p className="mt-3 text-sm font-medium leading-relaxed">
              {copy.channelAd.intro}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[Routes.Youtube, Routes.VKVideo, Routes.Bilibili].map((route) => (
              <a
                className="btn-outline"
                href={route.href}
                key={route.href}
                rel="noreferrer"
                target="_blank"
              >
                {route.label}
              </a>
            ))}
          </div>
        </div>

        <div className="meta">{status}</div>
      </section>
    );
  }

  return (
    <section className="sovia-test-ui space-y-6">
      <SoviaTestLanguageSwitcher
        copy={copy}
        locale={locale}
        locales={locales}
        onLocaleChange={setLocale}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 border-[3px] border-ink bg-paper px-4 py-3 shadow-[6px_6px_0_rgb(var(--shadow))]">
        <div className="meta">{copy.progress.label}</div>
        <div className="font-black text-ink [font-variant-numeric:tabular-nums]">
          {formatText(copy.progress.format, {
            current: currentPage + 1,
            total: totalPages,
          })}
        </div>
      </div>

      <div className="grid gap-8">
        {pageQuestions.map((question, questionOffset) => {
          const questionIndex = pageStart + questionOffset;

          return (
            <div
              className="card scroll-mt-36 space-y-6 focus:outline-none focus:ring-4 focus:ring-[rgb(var(--yellow))]"
              key={question.id}
              ref={(element) => {
                if (element) {
                  questionRefs.current.set(questionIndex, element);
                  return;
                }

                questionRefs.current.delete(questionIndex);
              }}
              tabIndex={-1}
            >
              <div className="flex items-start justify-between gap-5">
                <div className="space-y-3">
                  <div className="meta">
                    {formatText(copy.progress.format, {
                      current: questionIndex + 1,
                      total: copy.questions.length,
                    })}
                  </div>
                  <h2 className="text-2xl sm:text-3xl">{question.statement}</h2>
                </div>
                <div className="border-[3px] border-ink bg-red px-3 py-2 text-2xl font-black leading-none text-relief [font-variant-numeric:tabular-nums]">
                  {String(questionIndex + 1).padStart(2, "0")}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4 text-xs font-black uppercase leading-tight tracking-[0.06em] text-red">
                  <span>{copy.scale.leftHint}</span>
                  <span className="text-center">{copy.scale.middle}</span>
                  <span className="text-right">{copy.scale.rightHint}</span>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:hidden">
                  {MOBILE_ANSWER_OPTIONS.map((option) => {
                    const selected = answers[questionIndex] === option.value;

                    return (
                      <button
                        className={
                          selected
                            ? "border-[3px] border-ink bg-red px-3 py-5 text-xl font-black text-relief shadow-[5px_5px_0_rgb(var(--shadow))]"
                            : "border-[3px] border-ink bg-paper px-3 py-5 text-xl font-black text-ink shadow-[5px_5px_0_rgb(var(--shadow))] hover-bg-yellow hover-text-block"
                        }
                        key={option.label}
                        onClick={() => setAnswer(questionIndex, option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden grid-cols-[repeat(11,minmax(0,1fr))] gap-2 sm:grid">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
                    const selected = answers[questionIndex] === value;

                    return (
                      <button
                        className={
                          selected
                            ? "border-[3px] border-ink bg-red px-2 py-4 text-sm font-black uppercase text-relief shadow-[6px_6px_0_rgb(var(--shadow))]"
                            : "border-[3px] border-ink bg-paper px-2 py-4 text-sm font-black uppercase text-ink shadow-[6px_6px_0_rgb(var(--shadow))] hover-bg-yellow hover-text-block"
                        }
                        key={value}
                        onClick={() => setAnswer(questionIndex, value)}
                        type="button"
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <div
          className="flex scroll-mt-36 flex-wrap items-center justify-between gap-5 focus:outline-none focus:ring-4 focus:ring-[rgb(var(--yellow))]"
          ref={quizActionsRef}
          tabIndex={-1}
        >
          <div className="meta min-h-4">{quizStatus}</div>
          <div className="flex flex-wrap gap-4">
            <button
              className="btn-outline"
              disabled={currentPage === 0}
              onClick={goPrevious}
              type="button"
            >
              {copy.actions.previous}
            </button>

            {currentPage < totalPages - 1 ? (
              <button
                aria-disabled={!currentPageAnswered}
                className="btn-primary"
                onClick={goNextPage}
                type="button"
              >
                {copy.actions.continue}
              </button>
            ) : (
              <button
                aria-disabled={!currentPageAnswered || !allAnswered}
                className="btn-primary"
                onClick={goDemographics}
                type="button"
              >
                {copy.actions.submit}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
