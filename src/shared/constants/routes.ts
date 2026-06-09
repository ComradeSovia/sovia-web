import type { RouteItem } from "../model/nav";

export const Routes = {
  Center: { label: "Center", href: "/" },
  Sound: { label: "Browse Archive", href: "/sound" },
  Report: { label: "Report", href: "/report" },
  Gallery: { label: "Gallery", href: "/gallery" },
  X: { label: "View Images", href: "https://x.com/ComradeSovia" },
  Spotify: {
    label: "Play Originals",
    href: "https://open.spotify.com/artist/47LCSQdqODH3fx1UvPOHnA?si=EbLMW2NrR26tql5rdfeB9g&pi=eJKQ2GHmQMCOq",
  },
  Request: { label: "Request", href: "/request" },
  Notice: { label: "Notice", href: "/notice" },
  Youtube: { label: "Youtube", href: "https://www.youtube.com/@ComradeSovia" },
} as const satisfies Record<string, RouteItem>;
