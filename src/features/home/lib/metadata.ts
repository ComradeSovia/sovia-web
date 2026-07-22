import type { SharedCopy } from "@sovia/shared/i18n/copy";
import {
  createSiteMetadata,
  formatPageTitle,
} from "@sovia/shared/i18n/metadata";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import type { HomeCardItem } from "../data/home-cards";
import type { HomeCopy } from "../i18n/copy";

export function getAboutPageMetadata(
  copy: HomeCopy,
  locale: SiteLocale,
  path = "/about",
) {
  return createSiteMetadata({
    locale,
    path,
    title: copy.about.metadataTitle,
    description: copy.about.metadataDescription,
    openGraph: {
      title: copy.about.metadataTitle,
      description: copy.about.metadataDescription,
    },
  });
}

export function getHomeCardPageMetadata(
  card: HomeCardItem,
  sharedCopy: SharedCopy,
  locale: SiteLocale,
) {
  const title = formatPageTitle(card.title, sharedCopy.site.name);

  return createSiteMetadata({
    locale,
    path: card.route.href,
    title,
    description: card.pageIntro,
    openGraph: {
      title,
      description: card.pageIntro,
    },
  });
}

export function getSovietAnimePageMetadata(copy: HomeCopy, locale: SiteLocale) {
  return createSiteMetadata({
    locale,
    path: "/soviet-anime",
    title: copy.sovietAnime.metadataTitle,
    description: copy.sovietAnime.metadataDescription,
    openGraph: {
      title: copy.sovietAnime.metadataTitle,
      description: copy.sovietAnime.metadataDescription,
    },
  });
}
