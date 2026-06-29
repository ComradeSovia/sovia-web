import { getDefaultSharedCopy } from "../i18n/copy";

const copy = getDefaultSharedCopy();

export const SITE_NAME = copy.site.name;
export const SITE_TITLE = copy.site.title;
export const SITE_DESCRIPTION = copy.site.description;

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://sovia.work";

export const SITE_URL = rawSiteUrl.replace(/\/$/, "");

export const SITE_KEYWORDS = copy.site.keywords;

export function siteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}
