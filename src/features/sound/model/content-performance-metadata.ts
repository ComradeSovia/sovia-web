export const VOCAL_LANGUAGE_CODES = [
  "ru",
  "ja",
  "zh",
  "en",
  "de",
  "fr",
  "ko",
  "vi",
  "uk",
  "es",
  "it",
  "pl",
  "pt",
  "mul",
  "zxx",
] as const;
export const VOCAL_LANGUAGE_SUGGESTIONS =
  "ru, ja, zh, en, de, fr, ko, vi, uk, es, it, pl, pt; mul = multilingual with unspecified languages; zxx = no vocals";

// These are editor-supplied vocal language codes, never inferred from subtitles.
export function parseVocalLanguages(
  value: string | readonly string[] | null | undefined,
): string[] {
  const tokens =
    typeof value === "string" ? value.split(/[,;\s]+/) : (value ?? []);
  const languages = [
    ...new Set(
      tokens
        .filter(Boolean)
        .map((code) => code.trim().toLowerCase().split("-")[0]),
    ),
  ].sort();
  if (
    languages.some(
      (code) => !(VOCAL_LANGUAGE_CODES as readonly string[]).includes(code),
    )
  )
    throw new Error(
      "Use supported vocal ISO codes: ru, ja, zh, en, de, fr, ko, vi, uk, es, it, pl, pt, mul or zxx. Separate multiple languages with commas.",
    );
  if (languages.includes("zxx") && languages.length > 1)
    throw new Error("No vocals (zxx) cannot be combined with vocal languages.");
  if (languages.includes("mul") && languages.length > 1)
    throw new Error("Use explicit language codes or mul, not both.");
  return languages;
}

export function parseDurationSeconds(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;
  const seconds = Number(text);
  if (
    !/^\d+$/.test(text) ||
    !Number.isSafeInteger(seconds) ||
    seconds < 1 ||
    seconds > 2_147_483_647
  )
    throw new Error(
      "Duration must be a positive whole number of seconds; leave blank when unknown.",
    );
  return seconds;
}

export function vocalLanguageGroup(
  value: readonly string[] | null | undefined,
): string {
  const languages = parseVocalLanguages(value);
  if (!languages.length) return "Unknown vocal language";
  if (languages[0] === "zxx") return "No vocals";
  if (languages[0] === "mul") return "Multilingual (unspecified)";
  return languages.length > 1
    ? `Multilingual (${languages.join(" + ")})`
    : languages[0];
}

export function durationGroup(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isInteger(seconds) || seconds <= 0)
    return "Unknown duration";
  if (seconds < 120) return "Under 2 min";
  if (seconds < 240) return "2–4 min";
  if (seconds < 360) return "4–6 min";
  if (seconds < 600) return "6–10 min";
  return "10 min or longer";
}

export function matchesVocalLanguage(
  left: readonly string[] | null | undefined,
  right: readonly string[] | null | undefined,
): boolean {
  const a = parseVocalLanguages(left),
    b = parseVocalLanguages(right);
  return a.length > 0 && a.join(",") === b.join(",");
}
export function matchesDuration(
  left: number | null | undefined,
  right: number | null | undefined,
): boolean {
  return (
    durationGroup(left) !== "Unknown duration" &&
    durationGroup(left) === durationGroup(right)
  );
}

export function parseYoutubeDuration(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    value,
  );
  if (!match) return null;
  const seconds =
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0);
  return seconds > 0 && seconds <= 2_147_483_647 ? seconds : null;
}

export function performanceMetadataUpdate(value: {
  vocalLanguages?: readonly string[] | null;
  durationSeconds?: number | null;
}) {
  return {
    ...(value.vocalLanguages !== undefined
      ? { vocalLanguages: parseVocalLanguages(value.vocalLanguages) }
      : {}),
    ...(value.durationSeconds !== undefined
      ? { durationSeconds: parseDurationSeconds(value.durationSeconds) }
      : {}),
  };
}
export function durationAfterVideoChange(
  previous: string | null | undefined,
  next: string | null | undefined,
  seconds: number | null | undefined,
): number | null | undefined {
  return (previous || null) === (next || null) ? seconds : null;
}
