import {
  isSoviaTestAgeGroup,
  isSoviaTestGender,
  saveSoviaTestSubmission,
} from "@sovia/sovia-test/data/submissions";
import { SOVIA_TEST_LOCALES } from "@sovia/sovia-test/i18n/config";
import type { AxisKey } from "@sovia/sovia-test/types";
import { NextResponse } from "next/server";

const AXIS_KEYS: AxisKey[] = [
  "structure",
  "action",
  "influence",
  "understanding",
  "relation",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocale(value: string) {
  return SOVIA_TEST_LOCALES.some((locale) => locale === value);
}

function isVisitorId(value: string) {
  return /^[a-z0-9-]{16,64}$/i.test(value);
}

function parseScores(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const scores = {} as Record<AxisKey, number>;

  for (const axis of AXIS_KEYS) {
    const score = value[axis];

    if (typeof score !== "number" || !Number.isFinite(score)) {
      return null;
    }

    scores[axis] = score;
  }

  return scores;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const resultCode = body.resultCode;
  const resultHash = body.resultHash;
  const visitorId = body.visitorId;
  const locale = body.locale;
  const ageGroup = body.ageGroup;
  const gender = body.gender;
  const scores = parseScores(body.scores);

  if (
    typeof resultCode !== "string" ||
    !/^[A-Z]{5}$/.test(resultCode) ||
    typeof resultHash !== "string" ||
    !/^[a-z0-9]{8,64}$/.test(resultHash) ||
    typeof visitorId !== "string" ||
    !isVisitorId(visitorId) ||
    typeof locale !== "string" ||
    !isLocale(locale) ||
    typeof ageGroup !== "string" ||
    !isSoviaTestAgeGroup(ageGroup) ||
    typeof gender !== "string" ||
    !isSoviaTestGender(gender) ||
    !scores
  ) {
    return NextResponse.json(
      { error: "Invalid submission payload." },
      { status: 400 },
    );
  }

  const saved = await saveSoviaTestSubmission({
    visitorId,
    resultCode,
    resultHash,
    locale,
    ageGroup,
    gender,
    scores,
  });

  return NextResponse.json({ saved: Boolean(saved) });
}
