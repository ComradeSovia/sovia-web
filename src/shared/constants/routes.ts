import { getDefaultSharedCopy, type SharedCopy } from "../i18n/copy";
import type { SiteLocale } from "../i18n/site-locale";
import { getSiteLocalizedPath } from "../i18n/site-routing";
import type { RouteItem } from "../model/nav";

export function getRoutes(copy: SharedCopy, locale?: SiteLocale) {
  const href = (path: string) =>
    locale ? getSiteLocalizedPath(path, locale) : path;

  return {
    Center: { label: copy.routes.center, href: href("/") },
    About: { label: copy.routes.about, href: href("/about") },
    Sound: { label: copy.routes.sound, href: href("/sound") },
    Test: { label: copy.routes.test, href: href("/test") },
    Tools: { label: copy.routes.tools, href: href("/tools") },
    AirCon: { label: copy.routes.airCon, href: href("/tools/air-con") },
    LyricsLibrary: {
      label: copy.routes.lyricsLibrary,
      href: href("/lyrics-library"),
    },
    MusicRelease: {
      label: copy.routes.musicRelease,
      href: href("/music-release"),
    },
    ConceptDesign: {
      label: copy.routes.conceptDesign,
      href: href("/concept-design"),
    },
    VideoImages: {
      label: copy.routes.videoImages,
      href: href("/video-images"),
    },
    Community: { label: copy.routes.community, href: href("/community") },
    Report: { label: copy.routes.report, href: href("/report") },
    Gallery: { label: copy.routes.gallery, href: href("/gallery") },
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
    Request: { label: copy.routes.request, href: href("/request") },
    Notice: { label: copy.routes.notice, href: href("/notice") },
    Youtube: {
      label: copy.routes.youtube,
      href: "https://www.youtube.com/@ComradeSovia",
    },
  } as const satisfies Record<string, RouteItem>;
}

export const Routes = getRoutes(getDefaultSharedCopy());
