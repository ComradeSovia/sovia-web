export const SITE_NAME = "Comrade Sovia";
export const SITE_TITLE = "Comrade Sovia | Soviet-style Anime Music Archive";
export const SITE_DESCRIPTION =
  "Browse Comrade Sovia's Soviet-style anime and game music adaptations, lyrics, YouTube videos, and archive notes.";

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://sovia.app";

export const SITE_URL = rawSiteUrl.replace(/\/$/, "");

export const SITE_KEYWORDS = [
  "Comrade Sovia",
  "Sovia",
  "Soviet music",
  "anime music",
  "anime song covers",
  "Soviet choir",
  "YouTube music archive",
];

export function siteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}
