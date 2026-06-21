import { loadAllMusicWorks, SoundClient } from "@sovia/sound";
import { getDefaultSoundCopy } from "@sovia/sound/i18n/copy";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
const copy = getDefaultSoundCopy();

export const metadata: Metadata = {
  title: copy.page.title,
  description: copy.page.description,
  alternates: {
    canonical: "/sound",
  },
  openGraph: {
    title: `${copy.page.title} | Comrade Sovia`,
    description: copy.page.openGraphDescription,
    url: "/sound",
  },
};

export default async function MusicPage() {
  const musicWorks = await loadAllMusicWorks();

  return <SoundClient musicWorks={musicWorks} />;
}
