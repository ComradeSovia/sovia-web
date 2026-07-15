import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import type { MusicWorkWithContent } from "../model/music";

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

export function getWorkTitle(work: MusicWorkWithContent) {
  return work.title;
}

export function getLocalizedWorkTitle(
  work: MusicWorkWithContent,
  _locale?: SiteLocale,
) {
  return getWorkTitle(work);
}

export function getWorkDescription(
  work: MusicWorkWithContent,
  _locale?: SiteLocale,
) {
  const firstDescription =
    work.shortDescription ?? work.introText ?? work.productionNotes;

  if (firstDescription?.trim()) {
    return truncate(stripMarkdown(firstDescription), 155);
  }

  const source = work.original
    ? `Adapted from ${work.original}`
    : "An original Comrade Sovia work";
  const series = work.series ? ` from ${work.series}` : "";

  return truncate(
    `${source}${series}. Listen on YouTube and read archive notes in the Comrade Sovia sound collection.`,
    155,
  );
}
