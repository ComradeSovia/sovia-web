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

export function getWorkDescription(work: MusicWorkWithContent) {
  const descriptions = Object.values(work.descriptions || {});
  const firstDescription = descriptions.find(Boolean);

  if (firstDescription) {
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
