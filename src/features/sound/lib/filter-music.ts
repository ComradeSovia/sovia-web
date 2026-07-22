import type { MusicWork } from "../model/music";

export function filterMusic(list: MusicWork[], query: string): MusicWork[] {
  const queryTerms = normalizeText(query).split(" ").filter(Boolean);
  if (!queryTerms.length) return list;

  return list
    .map((work, index) => ({
      index,
      score: getMusicSearchScore(work, queryTerms),
      work,
    }))
    .filter(
      (item): item is { index: number; score: number; work: MusicWork } =>
        item.score !== null,
    )
    .sort(
      (first, second) =>
        second.score - first.score || first.index - second.index,
    )
    .map((item) => item.work);
}

type SearchField = {
  text: string;
  weight: number;
};

const CJK_CHARACTER_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

function getMusicSearchScore(work: MusicWork, queryTerms: string[]) {
  const fields = getSearchFields(work);
  const scores: number[] = [];

  for (const queryTerm of queryTerms) {
    const bestScore = fields.reduce<number | null>((best, field) => {
      const score = getFieldTermScore(queryTerm, field);
      if (score === null) return best;
      return best === null ? score : Math.max(best, score);
    }, null);

    if (bestScore === null) return null;
    scores.push(bestScore);
  }

  return Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
}

function getSearchFields(work: MusicWork): SearchField[] {
  return [
    { text: work.songTitle ?? work.title, weight: 1 },
    { text: work.title, weight: 0.95 },
    { text: work.fromTitle ?? work.original ?? "", weight: 0.9 },
    { text: work.fromArtists?.join(" ") ?? "", weight: 0.88 },
    { text: work.fromSeries ?? work.series ?? "", weight: 0.8 },
    { text: work.shortDescription ?? "", weight: 0.68 },
    { text: work.introText ?? "", weight: 0.65 },
    { text: work.productionNotes ?? "", weight: 0.55 },
    { text: work.bilibiliTitle ?? "", weight: 0.8 },
    { text: work.bilibiliDescription ?? "", weight: 0.6 },
    { text: work.vkTitle ?? "", weight: 0.8 },
    { text: work.vkDescription ?? "", weight: 0.6 },
    { text: work.pixivTitle ?? "", weight: 0.75 },
    { text: work.pixivDescription ?? "", weight: 0.58 },
    ...Object.values(work.youtubeLocalization ?? {}).flatMap((content) => [
      { text: content?.title ?? "", weight: 0.8 },
      { text: content?.description ?? "", weight: 0.6 },
    ]),
    { text: work.u2bId ?? "", weight: 0.95 },
    { text: work.bilibiliId ?? "", weight: 0.95 },
    { text: work.vkId ?? "", weight: 0.95 },
    { text: work.pixivId ?? "", weight: 0.95 },
    { text: work.contentId, weight: 0.9 },
    { text: work.path, weight: 0.85 },
  ]
    .map((field) => ({ ...field, text: normalizeText(field.text) }))
    .filter((field) => Boolean(field.text));
}

function getFieldTermScore(queryTerm: string, field: SearchField) {
  if (field.text.includes(queryTerm)) return Math.round(100 * field.weight);

  const similarity = CJK_CHARACTER_PATTERN.test(queryTerm)
    ? getCjkFuzzySimilarity(queryTerm, field.text)
    : getBestFuzzySimilarity(queryTerm, field.text.split(" "));
  return similarity === null ? null : Math.round(similarity * field.weight);
}

function getCjkFuzzySimilarity(queryTerm: string, fieldText: string) {
  const queryLength = Array.from(queryTerm).length;
  if (queryLength < 2) return null;

  const maxDistance =
    queryLength <= 4 ? 1 : Math.max(1, Math.floor(queryLength * 0.25));
  let bestSimilarity: number | null = null;

  // CJK titles are commonly written without word separators. Compare the query
  // to short character windows instead of treating a whole title as one word.
  for (const candidate of fieldText.split(" ")) {
    if (!CJK_CHARACTER_PATTERN.test(candidate)) continue;

    const characters = Array.from(candidate);
    const maximumCandidateLength = Math.min(
      characters.length,
      queryLength + maxDistance,
    );

    for (
      let candidateLength = queryLength;
      candidateLength <= maximumCandidateLength;
      candidateLength += 1
    ) {
      for (
        let start = 0;
        start <= characters.length - candidateLength;
        start += 1
      ) {
        const window = characters.slice(start, start + candidateLength).join("");
        const distance = getLevenshteinDistance(queryTerm, window);
        if (distance > maxDistance) continue;

        const similarity = 100 - (distance / queryLength) * 100;
        bestSimilarity =
          bestSimilarity === null
            ? similarity
            : Math.max(bestSimilarity, similarity);
      }
    }
  }

  return bestSimilarity;
}

function getBestFuzzySimilarity(queryTerm: string, candidates: string[]) {
  if (queryTerm.length < 3) return null;

  const maxDistance =
    queryTerm.length <= 4
      ? 1
      : Math.max(1, Math.floor(queryTerm.length * 0.25));
  let bestSimilarity: number | null = null;

  for (const candidate of candidates) {
    if (
      Math.abs(candidate.length - queryTerm.length) > maxDistance ||
      candidate[0] !== queryTerm[0]
    ) {
      continue;
    }

    const distance = getLevenshteinDistance(queryTerm, candidate);
    if (distance > maxDistance) continue;

    const similarity = 100 - (distance / queryTerm.length) * 100;
    bestSimilarity =
      bestSimilarity === null
        ? similarity
        : Math.max(bestSimilarity, similarity);
  }

  return bestSimilarity;
}

function getLevenshteinDistance(first: string, second: string) {
  const previous = Array.from(
    { length: second.length + 1 },
    (_, index) => index,
  );

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] +
          (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
}

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
