import { matchSiteLocale } from "@sovia/shared/i18n/site-locale";
import { loadMusicIndex } from "@sovia/sound";
import { SoviaTestComponent } from "@sovia/sovia-test";
import { matchSoviaTestLocale } from "@sovia/sovia-test/i18n/config";
import {
  getDefaultSoviaTestCopy,
  getSoviaTestCopy,
} from "@sovia/sovia-test/i18n/copy";
import {
  getSoviaTestAlternates,
  getSoviaTestCanonicalPath,
} from "@sovia/sovia-test/i18n/seo";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

const testCopy = getDefaultSoviaTestCopy();
const HASH_ALPHABET = "k7qz4vnr9x2mpt6c8bd5jwy3hfgs";
const HASH_KEY = [3, 1, 4, 1, 5, 2, 4, 3, 5, 1];
const SCORE_OFFSET = 200;
const SCORE_SCALE = 5;
const SCORE_HASH_CHUNK_SIZE = 2;
const AXIS_COUNT = 5;

type PageProps = {
  params: Promise<{
    hash: string;
    lang: string;
    testLang: string;
    type: string;
  }>;
};

function getLocales(lang: string, testLang: string) {
  const siteLocale = matchSiteLocale(lang);
  const testLocale = matchSoviaTestLocale(testLang);

  if (!siteLocale || !testLocale) {
    notFound();
  }

  return testLocale;
}

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
}: PageProps): Promise<Metadata> {
  const { hash, lang, testLang, type } = await params;
  const testLocale = getLocales(lang, testLang);
  const localizedCopy = getSoviaTestCopy(testLocale);
  const code = type.toUpperCase();
  const path = `/test/result/${type}/${hash}`;

  return {
    title: `${code} | ${localizedCopy.page.title}`,
    description: localizedCopy.page.subtitle,
    alternates: getSoviaTestAlternates(path, testLocale),
    openGraph: {
      title: `${code} | ${localizedCopy.page.title}`,
      description: localizedCopy.page.subtitle,
      url: getSoviaTestCanonicalPath(path, testLocale),
      locale: testLocale.replace("-", "_"),
    },
  };
}

export default async function LocalizedSiteTestResultPage({
  params,
}: PageProps) {
  const { hash, lang, testLang, type } = await params;
  const testLocale = getLocales(lang, testLang);
  const code = type.toUpperCase();

  if (testCopy.types[code] && !isValidResultHash(hash)) {
    redirect(getSoviaTestCanonicalPath(`/test/types/${type}`, testLocale));
  }

  const recommendedMusicWorks = await loadMusicIndex();

  return (
    <SoviaTestComponent
      initialHash={hash}
      initialLocale={testLocale}
      initialResultType={type}
      recommendedMusicWorks={recommendedMusicWorks}
    />
  );
}
