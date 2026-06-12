import { SoviaTestComponent } from "@sovia/sovia-test";
import { getDefaultSoviaTestCopy } from "@sovia/sovia-test/i18n/copy";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

const testCopy = getDefaultSoviaTestCopy();
const HASH_ALPHABET = "k7qz4vnr9x2mpt6c8bd5jwy3hfgs";
const HASH_KEY = [3, 1, 4, 1, 5, 2, 4, 3, 5, 1];
const SCORE_OFFSET = 200;
const SCORE_SCALE = 5;
const SCORE_HASH_CHUNK_SIZE = 2;
const AXIS_COUNT = 5;

type ResultPageProps = {
  params: Promise<{
    type: string;
    hash: string;
  }>;
};

function encodeAnswerToken(answer: number, index: number) {
  const encoded = (answer + HASH_KEY[index % HASH_KEY.length]) % 11;
  return HASH_ALPHABET[(encoded + index * 7) % HASH_ALPHABET.length];
}

function isValidAnswerHash(value: string) {
  if (value.length !== testCopy.questions.length + 1) {
    return false;
  }

  const body = value.slice(0, testCopy.questions.length);
  const checksum = value.at(-1);
  const answers = body.split("").map((token, index) => {
    for (let answer = 0; answer <= 10; answer += 1) {
      if (encodeAnswerToken(answer, index) === token) {
        return answer;
      }
    }

    return -1;
  });

  if (answers.some((answer) => answer < 0)) {
    return false;
  }

  const expectedChecksum = answers.reduce(
    (total, answer, index) => total + answer * (index + 3),
    0,
  );

  return checksum === HASH_ALPHABET[expectedChecksum % HASH_ALPHABET.length];
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

function isValidScoreHash(value: string) {
  const expectedLength = AXIS_COUNT * SCORE_HASH_CHUNK_SIZE + 1;

  if (value.length !== expectedLength) {
    return false;
  }

  const scores: number[] = [];

  for (let index = 0; index < AXIS_COUNT; index += 1) {
    const start = index * SCORE_HASH_CHUNK_SIZE;
    const score = decodeScoreValue(
      value.slice(start, start + SCORE_HASH_CHUNK_SIZE),
      index,
    );

    if (score === null) {
      return false;
    }

    scores.push(score);
  }

  const checksum = scores.reduce((total, score, index) => {
    return (
      total + (Math.round(score * SCORE_SCALE) + SCORE_OFFSET) * (index + 3)
    );
  }, 0);

  return value.at(-1) === HASH_ALPHABET[checksum % HASH_ALPHABET.length];
}

function isValidResultHash(value: string) {
  return isValidScoreHash(value) || isValidAnswerHash(value);
}

export async function generateMetadata({
  params,
}: ResultPageProps): Promise<Metadata> {
  const { type, hash } = await params;
  const code = type.toUpperCase();

  return {
    title: `${code} | ${testCopy.page.title}`,
    description: testCopy.page.subtitle,
    alternates: {
      canonical: `/test/result/${type}/${hash}`,
    },
    openGraph: {
      title: `${code} | ${testCopy.page.title}`,
      description: testCopy.page.subtitle,
      url: `/test/result/${type}/${hash}`,
    },
  };
}

export default async function TestResultPage({ params }: ResultPageProps) {
  const { type, hash } = await params;
  const code = type.toUpperCase();

  if (testCopy.types[code] && !isValidResultHash(hash)) {
    redirect(`/test/types/${type.toLowerCase()}`);
  }

  return <SoviaTestComponent initialHash={hash} initialResultType={type} />;
}
