import { getRoutes, Routes } from "@sovia/shared";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import type { RouteItem } from "@sovia/shared/model/nav";
import { getDefaultHomeCopy, type HomeCopy } from "../i18n/copy";

export type HomeCardItem = {
  id: string;
  title: string;
  subTitle: string;
  route: RouteItem;
  description: string;
  pageIntro: string;
  links: ReadonlyArray<RouteItem>;
};

function getCardConfig(sharedCopy?: SharedCopy, locale?: SiteLocale) {
  const routes = sharedCopy ? getRoutes(sharedCopy, locale) : Routes;

  return {
    "lyrics-library": {
      route: routes.LyricsLibrary,
      links: [routes.Sound],
    },
    "music-release": {
      route: routes.MusicRelease,
      links: [routes.Spotify, routes.AppleMusic, routes.YoutubeMusic],
    },
    "concept-design": {
      route: routes.ConceptDesign,
      links: [routes.X, routes.Instagram],
    },
    "video-images": {
      route: routes.VideoImages,
      links: [routes.Pixiv],
    },
    community: {
      route: routes.Community,
      links: [routes.Reddit, routes.Discord, routes.VK],
    },
  } as const satisfies Record<
    string,
    {
      links: ReadonlyArray<RouteItem>;
      route: RouteItem;
    }
  >;
}

export function getHomeCards(
  copy: HomeCopy,
  sharedCopy?: SharedCopy,
  locale?: SiteLocale,
): ReadonlyArray<HomeCardItem> {
  const cardConfig = getCardConfig(sharedCopy, locale);

  return copy.cards.map((card) => {
    const config = cardConfig[card.id as keyof typeof cardConfig];

    return {
      ...card,
      links: config.links,
      route: config.route,
    };
  });
}

export const HOME_CARDS = getHomeCards(getDefaultHomeCopy());

export function getHomeCard(
  id: HomeCardItem["id"],
  copy = getDefaultHomeCopy(),
  sharedCopy?: SharedCopy,
) {
  return getHomeCards(copy, sharedCopy).find((card) => card.id === id);
}
