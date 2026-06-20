import { SITE_URL } from "@sovia/shared";
import { loadMusicIndex } from "@sovia/sound";
import type { MetadataRoute } from "next";

const STATIC_PATHS = [
  "/",
  "/sound",
  "/lyrics-library",
  "/music-release",
  "/concept-design",
  "/video-images",
  "/community",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency: path === "/sound" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/sound" ? 0.9 : 0.7,
  }));

  const workRoutes: MetadataRoute.Sitemap = (await loadMusicIndex())
    .filter((work) => work.u2bId)
    .map((work) => ({
      url: `${SITE_URL}/sound/${work.path}`,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...workRoutes];
}
