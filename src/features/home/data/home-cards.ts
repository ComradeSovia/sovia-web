import { Routes } from "@sovia/shared";
import type { RouteItem } from "@sovia/shared/model/nav";

export type HomeCardItem = {
  id: string;
  title: string;
  subTitle: string;
  route: RouteItem;
  description: string;
  pageIntro: string;
  links: ReadonlyArray<RouteItem>;
};

export const HOME_CARDS = [
  {
    id: "lyrics-library",
    title: "Lyrics Library",
    subTitle: "Impression Lyrics Archive",
    route: Routes.LyricsLibrary,
    description:
      "Read the lyrics, song notes, and archive entries for Comrade Sovia works.",
    pageIntro:
      "The lyric and archive desk for Comrade Sovia works: song pages, source notes, YouTube records, and the text fragments attached to each adaptation.",
    links: [Routes.Sound],
  },
  {
    id: "music-release",
    title: "Music Release",
    subTitle: "Streaming Pages",
    route: Routes.MusicRelease,
    description:
      "Official music releases are collected on the streaming artist pages.",
    pageIntro:
      "Official streaming outposts for Comrade Sovia releases, gathered for listeners who prefer music platforms over the archive interface.",
    links: [Routes.Spotify, Routes.AppleMusic, Routes.YoutubeMusic],
  },
  {
    id: "concept-design",
    title: "Concept Design",
    subTitle: "Anime & Realism Styles",
    route: Routes.ConceptDesign,
    description:
      "Anime-styled visual work lives on X, while realistic images and polished visual updates live on IG.",
    pageIntro:
      "Visual design channels for the Sovia project, split between anime-styled development, realism studies, and polished public updates.",
    links: [Routes.X, Routes.Instagram],
  },
  {
    id: "video-images",
    title: "Video Images",
    subTitle: "Thumbnails & Design Materials",
    route: Routes.VideoImages,
    description:
      "Video thumbnail designs and other image materials used around the videos are collected on Pixiv.",
    pageIntro:
      "A collection point for thumbnail work, illustration materials, and visual assets connected to Comrade Sovia videos.",
    links: [Routes.Pixiv],
  },
  {
    id: "community",
    title: "Community",
    subTitle: "Regional & Discussion Spaces",
    route: Routes.Community,
    description:
      "Places for discussion, sharing, and the Russian-region community around Sovia.",
    pageIntro:
      "Community spaces for discussion, updates, regional posts, and people following the Sovia archive from different platforms.",
    links: [Routes.Reddit, Routes.Discord, Routes.VK],
  },
] as const satisfies ReadonlyArray<HomeCardItem>;

export function getHomeCard(id: HomeCardItem["id"]) {
  return HOME_CARDS.find((card) => card.id === id);
}
