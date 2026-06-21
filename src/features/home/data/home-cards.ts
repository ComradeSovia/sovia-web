import { Routes } from "@sovia/shared";
import type { RouteItem } from "@sovia/shared/model/nav";
import { getDefaultHomeCopy } from "../i18n/copy";

export type HomeCardItem = {
  id: string;
  title: string;
  subTitle: string;
  route: RouteItem;
  description: string;
  pageIntro: string;
  links: ReadonlyArray<RouteItem>;
};

const copy = getDefaultHomeCopy();

const CARD_CONFIG = {
  "lyrics-library": {
    route: Routes.LyricsLibrary,
    links: [Routes.Sound],
  },
  "music-release": {
    route: Routes.MusicRelease,
    links: [Routes.Spotify, Routes.AppleMusic, Routes.YoutubeMusic],
  },
  "concept-design": {
    route: Routes.ConceptDesign,
    links: [Routes.X, Routes.Instagram],
  },
  "video-images": {
    route: Routes.VideoImages,
    links: [Routes.Pixiv],
  },
  community: {
    route: Routes.Community,
    links: [Routes.Reddit, Routes.Discord, Routes.VK],
  },
} as const satisfies Record<
  string,
  {
    links: ReadonlyArray<RouteItem>;
    route: RouteItem;
  }
>;

export const HOME_CARDS = copy.cards.map((card) => {
  const config = CARD_CONFIG[card.id as keyof typeof CARD_CONFIG];

  return {
    ...card,
    links: config.links,
    route: config.route,
  };
}) satisfies ReadonlyArray<HomeCardItem>;

export function getHomeCard(id: HomeCardItem["id"]) {
  return HOME_CARDS.find((card) => card.id === id);
}
