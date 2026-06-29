import type { Metadata } from "next";
import { siteUrl } from "../config/site";
import { getSharedCopy, type SharedCopy } from "./copy";
import type { SiteLocale } from "./site-locale";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "./site-routing";

type MetadataPageCopy = {
  description?: string;
  openGraphDescription?: string;
  subtitle?: string;
  title: string;
};

type SiteMetadataOptions = {
  description: string;
  locale: SiteLocale;
  openGraph?: {
    description?: string;
    images?: NonNullable<Metadata["openGraph"]>["images"];
    title?: string;
    url?: string;
  };
  path: string;
  robots?: Metadata["robots"];
  title: string;
};

export function formatPageTitle(title: string, siteName: string) {
  return `${title} | ${siteName}`;
}

export function createSiteMetadata({
  description,
  locale,
  openGraph,
  path,
  robots,
  title,
}: SiteMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: getSiteMetadataAlternates(path, locale),
    ...(robots ? { robots } : {}),
    ...(openGraph
      ? {
          openGraph: {
            title: openGraph.title ?? title,
            description: openGraph.description ?? description,
            url: openGraph.url ?? siteUrl(getSiteLocalizedPath(path, locale)),
            ...(openGraph.images ? { images: openGraph.images } : {}),
          },
        }
      : {}),
  };
}

export function getSiteHomeMetadata(locale: SiteLocale) {
  const copy = getSharedCopy(locale);

  return createSiteMetadata({
    locale,
    path: "/",
    title: copy.site.title,
    description: copy.site.description,
  });
}

export function getSharedPageMetadata(
  locale: SiteLocale,
  pageKey: keyof SharedCopy["pages"],
  path: string,
  options: Pick<SiteMetadataOptions, "openGraph" | "robots"> = {},
) {
  const copy = getSharedCopy(locale);
  const page = copy.pages[pageKey] as MetadataPageCopy;
  const description =
    page.description ?? page.openGraphDescription ?? page.subtitle ?? "";

  return createSiteMetadata({
    locale,
    path,
    title: page.title,
    description,
    ...options,
  });
}
