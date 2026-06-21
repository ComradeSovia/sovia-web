import { getDefaultSharedCopy } from "../i18n/copy";
import type { RouteItem } from "../model/nav";

const copy = getDefaultSharedCopy();

export const Routes = {
  Center: { label: copy.routes.center, href: "/" },
  About: { label: copy.routes.about, href: "/about" },
  Sound: { label: copy.routes.sound, href: "/sound" },
  Test: { label: copy.routes.test, href: "/test" },
  LyricsLibrary: { label: copy.routes.lyricsLibrary, href: "/lyrics-library" },
  MusicRelease: { label: copy.routes.musicRelease, href: "/music-release" },
  ConceptDesign: { label: copy.routes.conceptDesign, href: "/concept-design" },
  VideoImages: { label: copy.routes.videoImages, href: "/video-images" },
  Community: { label: copy.routes.community, href: "/community" },
  Report: { label: copy.routes.report, href: "/report" },
  Gallery: { label: copy.routes.gallery, href: "/gallery" },
  X: { label: copy.routes.x, href: "https://x.com/ComradeSovia" },
  VK: { label: copy.routes.vk, href: "https://vk.com/comradesovia" },
  VKVideo: {
    label: copy.routes.vkVideo,
    href: "https://vkvideo.ru/@comradesovia",
  },
  Discord: {
    label: copy.routes.discord,
    href: "https://discord.gg/dX4V42ejpd",
  },
  Instagram: {
    label: copy.routes.instagram,
    href: "https://www.instagram.com/comradesovia/",
  },
  Pixiv: {
    label: copy.routes.pixiv,
    href: "https://www.pixiv.net/en/users/126922434",
  },
  Reddit: {
    label: copy.routes.reddit,
    href: "https://www.reddit.com/r/sovia/",
  },
  Bilibili: {
    label: copy.routes.bilibili,
    href: "https://space.bilibili.com/52845729",
  },
  Spotify: {
    label: copy.routes.spotify,
    href: "https://open.spotify.com/artist/47LCSQdqODH3fx1UvPOHnA?si=EbLMW2NrR26tql5rdfeB9g&pi=eJKQ2GHmQMCOq",
  },
  AppleMusic: {
    label: copy.routes.appleMusic,
    href: "https://music.apple.com/ru/artist/comrade-sovia/1860353708",
  },
  YoutubeMusic: {
    label: copy.routes.youtubeMusic,
    href: "https://music.youtube.com/@comradesovia",
  },
  Request: { label: copy.routes.request, href: "/request" },
  Notice: { label: copy.routes.notice, href: "/notice" },
  Youtube: {
    label: copy.routes.youtube,
    href: "https://www.youtube.com/@ComradeSovia",
  },
} as const satisfies Record<string, RouteItem>;
