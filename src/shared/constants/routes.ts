import type { RouteItem } from "../model/nav";

export const Routes = {
  Center: { label: "Center", href: "/" },
  About: { label: "About Sovia", href: "/about" },
  Sound: { label: "Songs", href: "/sound" },
  Test: { label: "SOVIA-Test", href: "/test" },
  LyricsLibrary: { label: "Lyrics Library", href: "/sound" },
  Report: { label: "Report", href: "/report" },
  Gallery: { label: "Gallery", href: "/gallery" },
  X: { label: "X (Anime Style)", href: "https://x.com/ComradeSovia" },
  VK: { label: "VK Community", href: "https://vk.com/comradesovia" },
  VKVideo: { label: "VK-Video", href: "https://vkvideo.ru/@comradesovia" },
  Discord: { label: "Join Discord", href: "https://discord.gg/dX4V42ejpd" },
  Instagram: {
    label: "IG (Realism Style)",
    href: "https://www.instagram.com/comradesovia/",
  },
  Reddit: { label: "Reddit", href: "https://www.reddit.com/r/sovia/" },
  Bilibili: {
    label: "Bilibili",
    href: "https://space.bilibili.com/52845729",
  },
  Spotify: {
    label: "Spotify",
    href: "https://open.spotify.com/artist/47LCSQdqODH3fx1UvPOHnA?si=EbLMW2NrR26tql5rdfeB9g&pi=eJKQ2GHmQMCOq",
  },
  AppleMusic: {
    label: "Apple Music",
    href: "https://music.apple.com/ru/artist/comrade-sovia/1860353708",
  },
  Request: { label: "Request", href: "/request" },
  Notice: { label: "Notice", href: "/notice" },
  Youtube: { label: "YouTube", href: "https://www.youtube.com/@ComradeSovia" },
} as const satisfies Record<string, RouteItem>;
