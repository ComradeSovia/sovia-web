import { loadAllMusicWorks, SoundClient } from "@sovia/sound";
import { getDefaultSoundCopy, getSoundCopy } from "@sovia/sound/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
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
  const locale = await getCurrentSiteLocale();
  const musicWorks = await loadAllMusicWorks();

  return <SoundClient copy={getSoundCopy(locale)} musicWorks={musicWorks} />;
}
