export type CandidateComponent = {
  key: string;
  label: string;
  weight: number;
  sampleSize: number;
  median: number | null;
  reference: number[];
  sampleIds?: string[];
};

// Midrank percentile: ties occupy the midpoint, so identical populations score 50.
export function evidencePercentile(
  value: number | null,
  reference: readonly number[],
): number | null {
  const valid = reference.filter(Number.isFinite);
  if (value === null || !Number.isFinite(value) || valid.length < 5)
    return null;
  return (
    ((valid.filter((item) => item < value).length +
      valid.filter((item) => item === value).length / 2) /
      valid.length) *
    100
  );
}

export function calculateCandidateScore(input: {
  components: CandidateComponent[];
  exactMatches: number;
  allowRemake: boolean;
  possibleTitleMatches?: boolean;
}) {
  const components = input.components.map((component) => ({
    ...component,
    baselineSize: component.reference.length,
    percentile:
      component.sampleSize >= 5
        ? evidencePercentile(component.median, component.reference)
        : null,
    reference: undefined,
  }));
  const available = components.filter(
    (component) => component.percentile !== null,
  );
  const coverage = available.reduce(
    (sum, component) => sum + component.weight,
    0,
  );
  const excluded = input.exactMatches > 0 && !input.allowRemake;
  const raw =
    coverage >= 50
      ? available.reduce(
          (sum, component) =>
            sum + (component.percentile ?? 0) * component.weight,
          0,
        ) / coverage
      : null;
  const remakePenalty = input.allowRemake
    ? Math.min(20, input.exactMatches * 5)
    : 0;
  return {
    version: "transparent-rules-v1",
    status: excluded
      ? "excluded_existing_source"
      : raw === null
        ? "insufficient_evidence"
        : input.possibleTitleMatches
          ? "review_partial_match"
          : "scored",
    score:
      excluded || raw === null
        ? null
        : Math.round(Math.max(0, raw - remakePenalty) * 10) / 10,
    rawScore: excluded ? null : raw,
    evidenceCoveragePercent: coverage,
    minimumEvidenceCoveragePercent: 50,
    confidence:
      excluded || raw === null
        ? "unavailable"
        : coverage >= 75 &&
            available.every((component) => component.sampleSize >= 10)
          ? "higher"
          : "limited",
    remakePenalty,
    exactMatches: input.exactMatches,
    allowRemake: input.allowRemake,
    components,
    formula:
      "Available component midrank percentiles × weights / available weight; only cohorts and baselines with >=5 measured works count. Require >=50% weight coverage. Explicit remake mode subtracts 5 points per exact existing source/version (cap 20).",
    limitations: [
      "A historical catalog-fit rule, not predicted views or causal evidence. Factor medians are marginal comparisons; only the conversion cohort intersects all provided attributes. Compare scores only with comparable evidence coverage, windows, and attributes.",
      "Missing components stay unknown and contribute no weight. No external freshness/trend or user-level audience-affinity score is fabricated.",
      "No catalog match does not guarantee that the song is unproduced. Partial matches require manual review.",
    ],
  };
}

export function normalizeCandidateText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function isExactCandidateSource(
  candidate: {
    title: string;
    sourceTitle?: string;
    artist?: string;
    ip?: string;
  },
  existing: {
    title: string;
    sourceTitle?: string | null;
    artists?: string[] | null;
    ip?: string | null;
  },
) {
  const query = normalizeCandidateText(
    candidate.sourceTitle || candidate.title,
  );
  if (
    !query ||
    (normalizeCandidateText(existing.sourceTitle) !== query &&
      normalizeCandidateText(existing.title) !== query)
  )
    return false;
  if (
    candidate.artist &&
    !existing.artists?.some(
      (artist) =>
        normalizeCandidateText(artist) ===
        normalizeCandidateText(candidate.artist),
    )
  )
    return false;
  if (
    candidate.ip &&
    normalizeCandidateText(candidate.ip) !== normalizeCandidateText(existing.ip)
  )
    return false;
  return true;
}
