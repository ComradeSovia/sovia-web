import type { Metadata } from "next";
import { loadAllMusicWorks } from "@/lib/load-music";
import { SoundClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sound Works",
  description:
    "Search Comrade Sovia's archive of Soviet-style anime, game, Vocaloid, and pop music adaptations with lyrics and YouTube links.",
  alternates: {
    canonical: "/sound",
  },
  openGraph: {
    title: "Sound Works | Comrade Sovia",
    description:
      "Browse Soviet-style anime and game music adaptations from Comrade Sovia.",
    url: "/sound",
  },
};

export default async function MusicPage() {
  const musicWorks = await loadAllMusicWorks();

  return <SoundClient musicWorks={musicWorks} />;
}
