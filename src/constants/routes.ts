import type { RouteItem } from "@/definitions/nav.def";

export const Routes = {
  Center: { label: "Center", href: "/" },
  Sound: { label: "Sound", href: "/sound" },
  Report: { label: "Report", href: "/report" },
  Gallery: { label: "Gallery", href: "/gallery" },
  Request: { label: "Request", href: "/request" },
  Notice: { label: "Notice", href: "/notice" },
  Youtube: { label: "Youtube", href: "https://www.youtube.com/@ComradeSovia" },
} as const satisfies Record<string, RouteItem>;
