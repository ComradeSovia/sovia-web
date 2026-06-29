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

const DEFAULT_OPEN_GRAPH_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
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
  const copy = getSharedCopy(locale);
  const canonicalUrl = siteUrl(getSiteLocalizedPath(path, locale));
  const openGraphTitle = openGraph?.title ?? title;
  const openGraphDescription = openGraph?.description ?? description;
  const openGraphImages = openGraph?.images ?? [
    {
      ...DEFAULT_OPEN_GRAPH_IMAGE,
      alt: openGraphTitle,
    },
  ];

  return {
    title,
    description,
    alternates: getSiteMetadataAlternates(path, locale),
    ...(robots ? { robots } : {}),
    openGraph: {
      type: "website",
      locale: locale.replace("-", "_"),
      siteName: copy.site.name,
      title: openGraphTitle,
      description: openGraphDescription,
      url: openGraph?.url ?? canonicalUrl,
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: openGraphTitle,
      description: openGraphDescription,
      images: openGraphImages,
    },
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
