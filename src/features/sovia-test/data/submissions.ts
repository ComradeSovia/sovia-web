import { createHash } from "node:crypto";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  type AxisKey,
  SOVIA_TEST_AGE_GROUPS,
  SOVIA_TEST_GENDER_OPTIONS,
  type SoviaTestAgeGroup,
  type SoviaTestGender,
} from "../types";

export type SoviaTestSubmissionInput = {
  visitorId: string;
  resultCode: string;
  resultHash: string;
  locale: string;
  ageGroup: SoviaTestAgeGroup;
  gender: SoviaTestGender;
  scores: Record<AxisKey, number>;
};

export type SoviaTestStats = {
  totalSubmissions: number;
  topResults: Array<{
    code: string;
    count: number;
  }>;
};

export function isSoviaTestAgeGroup(value: string): value is SoviaTestAgeGroup {
  return SOVIA_TEST_AGE_GROUPS.some((ageGroup) => ageGroup === value);
}

export function isSoviaTestGender(value: string): value is SoviaTestGender {
  return SOVIA_TEST_GENDER_OPTIONS.some((gender) => gender === value);
}

function createSubmissionFingerprint(visitorId: string) {
  return createHash("sha256")
    .update(`sovia-test-submission:v1:${visitorId}`)
    .digest("hex");
}

export async function saveSoviaTestSubmission(input: SoviaTestSubmissionInput) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const fingerprint = createSubmissionFingerprint(input.visitorId);

  try {
    return await prisma.soviaTestSubmission.upsert({
      where: {
        fingerprint,
      },
      create: {
        visitorId: input.visitorId,
        fingerprint,
        resultCode: input.resultCode,
        resultHash: input.resultHash,
        locale: input.locale,
        ageGroup: input.ageGroup,
        gender: input.gender,
        scores: input.scores as Prisma.InputJsonValue,
      },
      update: {
        resultCode: input.resultCode,
        resultHash: input.resultHash,
        locale: input.locale,
        ageGroup: input.ageGroup,
        gender: input.gender,
        scores: input.scores as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });
  } catch {
    return null;
  }
}

export async function loadSoviaTestStats(): Promise<SoviaTestStats | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const [totalSubmissions, topResults] = await Promise.all([
      prisma.soviaTestSubmission.count(),
      prisma.soviaTestSubmission.groupBy({
        by: ["resultCode"],
        _count: {
          resultCode: true,
        },
        orderBy: {
          _count: {
            resultCode: "desc",
          },
        },
      }),
    ]);

    return {
      totalSubmissions,
      topResults: topResults.map((result) => ({
        code: result.resultCode,
        count: result._count.resultCode,
      })),
    };
  } catch {
    return null;
  }
}
