type ContentSearchWork = {
  bilibiliDescription?: string | null;
  bilibiliId?: string | null;
  bilibiliTitle?: string | null;
  contentId: string;
  fromArtists?: string[] | null;
  fromDetails?: string | null;
  fromIp?: string | null;
  fromSeries?: string | null;
  fromSession?: string | null;
  fromTitle?: string | null;
  introText?: string | null;
  lyrics?: string | null;
  path: string;
  pixivDescription?: string | null;
  pixivId?: string | null;
  pixivTags?: string | string[] | null;
  pixivTitle?: string | null;
  productionNotes?: string | null;
  shortDescription?: string | null;
  songTitle?: string | null;
  subtitleTracks?: Partial<Record<string, string>> | null;
  title: string;
  u2bId?: string | null;
  visible?: boolean | null;
  vkDescription?: string | null;
  vkId?: string | null;
  vkTitle?: string | null;
  workType: string;
  youtubeLocalization?: Partial<
    Record<string, { description?: string | null; title?: string | null }>
  > | null;
};

type SearchFilters = {
  artists: string[];
  excludedPlatforms: string[];
  excludedTags: string[];
  freeText: string[];
  ids: string[];
  ips: string[];
  platformIncludes: string[];
  platformMatches: string[];
  series: string[];
  tagIncludes: string[];
  tagMatches: string[];
  titles: string[];
  visible?: boolean;
  workTypes: string[];
};

const PLATFORM_ALIASES: Record<string, string> = {
  bilibili: "bilibili",
  pixiv: "pixiv",
  u2b: "youtube",
  vk: "vk",
  youtube: "youtube",
  yt: "youtube",
};

export function matchesContentSearchQuery(
  work: ContentSearchWork,
  query?: string,
) {
  return getContentSearchScore(work, query) !== null;
}

export function getContentSearchScore(work: ContentSearchWork, query?: string) {
  const filters = parseContentSearchQuery(query);
  const platforms = getWorkPlatforms(work);
  const tags = getTags(work.pixivTags);
  const scores: number[] = [];

  if (!matchesStructuredFilters(filters, platforms, tags, work)) return null;

  const freeTextScore = getAllMatchScore(filters.freeText, getSearchText(work));
  if (freeTextScore === null) return null;
  scores.push(...freeTextScore);

  const seriesScore = getAllMatchScore(
    filters.series,
    normalizeText(work.fromSeries),
  );
  if (seriesScore === null) return null;
  scores.push(...seriesScore);

  const titleScore = getAllMatchScore(filters.titles, getTitleText(work));
  if (titleScore === null) return null;
  scores.push(...titleScore);

  const artistScore = getAllMatchScore(
    filters.artists,
    normalizeText(work.fromArtists?.join(" ")),
  );
  if (artistScore === null) return null;
  scores.push(...artistScore);

  const ipScore = getAllMatchScore(filters.ips, normalizeText(work.fromIp));
  if (ipScore === null) return null;
  scores.push(...ipScore);

  const idScore = getAllMatchScore(filters.ids, getIdentifierText(work));
  if (idScore === null) return null;
  scores.push(...idScore);

  const workTypeScore = getAllMatchScore(
    filters.workTypes,
    normalizeText(work.workType),
  );
  if (workTypeScore === null) return null;
  scores.push(...workTypeScore);

  for (const tag of [...filters.tagMatches, ...filters.tagIncludes]) {
    const score = getTagMatchScore(tags, tag);
    if (score !== null) scores.push(score);
  }

  if (!scores.length) return 0;
  return Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
}

export function matchesContentSearchStructuredFilters(
  work: ContentSearchWork,
  query?: string,
) {
  return matchesStructuredFilters(
    parseContentSearchQuery(query),
    getWorkPlatforms(work),
    getTags(work.pixivTags),
    work,
  );
}

export function getContentSearchSemanticQuery(query?: string) {
  const filters = parseContentSearchQuery(query);
  const lines = [
    ...filters.freeText,
    ...filters.series.map((value) => `Series: ${value}`),
    ...filters.titles.map((value) => `Title: ${value}`),
    ...filters.artists.map((value) => `Artist: ${value}`),
    ...filters.ips.map((value) => `Source IP: ${value}`),
  ];

  return lines.join("\n");
}

function parseContentSearchQuery(query?: string): SearchFilters {
  const filters: SearchFilters = {
    artists: [],
    excludedPlatforms: [],
    excludedTags: [],
    freeText: [],
    ids: [],
    ips: [],
    platformIncludes: [],
    platformMatches: [],
    series: [],
    tagIncludes: [],
    tagMatches: [],
    titles: [],
    workTypes: [],
  };

  for (const token of tokenize(query ?? "")) {
    const exclusion = token.startsWith("-");
    const value = exclusion ? token.slice(1) : token;
    const separator = value.indexOf(":");

    if (separator <= 0) {
      if (!exclusion) addFilterValue(filters.freeText, value);
      continue;
    }

    const field = value.slice(0, separator).toLowerCase();
    const fieldValue = value.slice(separator + 1);
    const values = splitFilterValues(fieldValue);

    if (!values.length || !addFieldFilter(filters, field, values, exclusion)) {
      if (!exclusion) addFilterValue(filters.freeText, value);
    }
  }

  return filters;
}

function addFieldFilter(
  filters: SearchFilters,
  field: string,
  values: string[],
  exclusion: boolean,
) {
  switch (field) {
    case "series":
      if (!exclusion) filters.series.push(...values);
      return true;
    case "title":
      if (!exclusion) filters.titles.push(...values);
      return true;
    case "artist":
    case "artists":
      if (!exclusion) filters.artists.push(...values);
      return true;
    case "ip":
      if (!exclusion) filters.ips.push(...values);
      return true;
    case "id":
    case "cid":
    case "path":
      if (!exclusion) filters.ids.push(...values);
      return true;
    case "platform":
      (exclusion ? filters.excludedPlatforms : filters.platformMatches).push(
        ...values.map(normalizePlatform).filter(Boolean),
      );
      return true;
    case "platform_includes":
      if (!exclusion) {
        filters.platformIncludes.push(
          ...values.map(normalizePlatform).filter(Boolean),
        );
      }
      return true;
    case "platform_not_includes":
      filters.excludedPlatforms.push(
        ...values.map(normalizePlatform).filter(Boolean),
      );
      return true;
    case "tag":
      (exclusion ? filters.excludedTags : filters.tagMatches).push(...values);
      return true;
    case "tag_includes":
      if (!exclusion) filters.tagIncludes.push(...values);
      return true;
    case "tag_not_includes":
      filters.excludedTags.push(...values);
      return true;
    case "visible": {
      const visible = parseBoolean(values[0]);
      if (visible !== undefined && !exclusion) filters.visible = visible;
      return visible !== undefined;
    }
    case "work_type":
    case "type":
      if (!exclusion) filters.workTypes.push(...values);
      return true;
    default:
      return false;
  }
}

function tokenize(query: string) {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;

  for (const character of query.trim()) {
    if (character === '"') {
      quoted = !quoted;
    } else if (/\s/.test(character) && !quoted) {
      if (current) tokens.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  if (current) tokens.push(current);
  return tokens;
}

function splitFilterValues(value: string) {
  return value
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function addFilterValue(values: string[], value: string) {
  const normalized = normalizeText(value);
  if (normalized) values.push(normalized);
}

function getWorkPlatforms(work: ContentSearchWork) {
  const platforms = new Set<string>();
  if (work.u2bId) platforms.add("youtube");
  if (work.bilibiliId) platforms.add("bilibili");
  if (work.vkId) platforms.add("vk");
  if (work.pixivId) platforms.add("pixiv");
  return platforms;
}

function matchesStructuredFilters(
  filters: SearchFilters,
  platforms: Set<string>,
  tags: string[],
  work: ContentSearchWork,
) {
  if (
    filters.visible !== undefined &&
    Boolean(work.visible) !== filters.visible
  ) {
    return false;
  }
  if (
    filters.platformMatches.length &&
    !filters.platformMatches.some((platform) => platforms.has(platform))
  ) {
    return false;
  }
  if (
    filters.platformIncludes.some((platform) => !platforms.has(platform)) ||
    filters.excludedPlatforms.some((platform) => platforms.has(platform))
  ) {
    return false;
  }
  if (
    filters.tagMatches.length &&
    !filters.tagMatches.some((tag) => getTagMatchScore(tags, tag) !== null)
  ) {
    return false;
  }
  if (
    filters.tagIncludes.some((tag) => getTagMatchScore(tags, tag) === null) ||
    filters.excludedTags.some((tag) => getTagMatchScore(tags, tag) !== null)
  ) {
    return false;
  }

  return true;
}

function getSearchText(work: ContentSearchWork) {
  return normalizeText(
    [
      work.path,
      work.contentId,
      work.songTitle,
      work.title,
      work.fromTitle,
      work.fromArtists?.join(" "),
      work.fromIp,
      work.fromSeries,
      work.fromSession,
      work.fromDetails,
      work.u2bId,
      work.bilibiliId,
      work.bilibiliTitle,
      work.bilibiliDescription,
      work.vkId,
      work.vkTitle,
      work.vkDescription,
      work.pixivId,
      work.pixivTitle,
      work.pixivDescription,
      getTags(work.pixivTags).join(" "),
      work.shortDescription,
      work.introText,
      work.productionNotes,
      work.lyrics,
      ...Object.values(work.youtubeLocalization ?? {}).flatMap((content) => [
        content?.title,
        content?.description,
      ]),
      ...Object.values(work.subtitleTracks ?? {}),
    ].join(" "),
  );
}

function getTitleText(work: ContentSearchWork) {
  return normalizeText([work.songTitle, work.title, work.fromTitle].join(" "));
}

function getIdentifierText(work: ContentSearchWork) {
  return normalizeText(
    [
      work.contentId,
      work.path,
      work.u2bId,
      work.bilibiliId,
      work.vkId,
      work.pixivId,
    ].join(" "),
  );
}

function getAllMatchScore(values: string[], text: string) {
  const scores = values.map((value) => getFuzzyMatchScore(value, text));
  return scores.every((score): score is number => score !== null)
    ? scores
    : null;
}

function getTagMatchScore(tags: string[], value: string) {
  return tags.reduce<number | null>((bestScore, tag) => {
    const score = getFuzzyMatchScore(value, tag);
    if (score === null) return bestScore;
    return bestScore === null ? score : Math.max(bestScore, score);
  }, null);
}

function getFuzzyMatchScore(query: string, text: string) {
  if (!query) return 100;
  if (text.includes(query)) return 100;

  const queryTerms = query.split(" ").filter(Boolean);
  const textTerms = text.split(" ").filter(Boolean);
  const scores: number[] = [];

  for (const queryTerm of queryTerms) {
    const score = getBestTermScore(queryTerm, textTerms);
    if (score === null) return null;
    scores.push(score);
  }

  return scores.length
    ? Math.round(
        scores.reduce((total, score) => total + score, 0) / scores.length,
      )
    : null;
}

function getBestTermScore(queryTerm: string, textTerms: string[]) {
  if (queryTerm.length < 3) return null;

  const maxDistance =
    queryTerm.length <= 4
      ? 1
      : Math.max(1, Math.floor(queryTerm.length * 0.25));
  let bestScore: number | null = null;

  for (const textTerm of textTerms) {
    if (
      Math.abs(textTerm.length - queryTerm.length) > maxDistance ||
      textTerm[0] !== queryTerm[0]
    ) {
      continue;
    }

    const distance = getLevenshteinDistance(queryTerm, textTerm);
    if (distance > maxDistance) continue;

    const score = Math.round(100 - (distance / queryTerm.length) * 100);
    bestScore = bestScore === null ? score : Math.max(bestScore, score);
  }

  return bestScore;
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

function getTags(tags?: string | string[] | null) {
  const values = Array.isArray(tags) ? tags : (tags?.split(",") ?? []);
  return values.map(normalizeText).filter(Boolean);
}

function normalizePlatform(value: string) {
  return PLATFORM_ALIASES[normalizeText(value)] ?? "";
}

function parseBoolean(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
