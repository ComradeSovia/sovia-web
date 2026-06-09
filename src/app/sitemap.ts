import { SITE_URL } from "@sovia/shared";
import { loadMusicIndex } from "@sovia/sound";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/sound`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const workRoutes: MetadataRoute.Sitemap = loadMusicIndex()
    .filter((work) => work.u2bId)
    .map((work) => ({
      url: `${SITE_URL}/sound/${work.path}`,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...workRoutes];
}
