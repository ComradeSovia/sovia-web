import { getSharedCopy } from "@sovia/shared/i18n/copy";
import {
  createSiteMetadata,
  formatPageTitle,
} from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { loadAllMusicWorks, SoundClient } from "@sovia/sound";
import { getSoundCopy } from "@sovia/sound/i18n/copy";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSoundCopy(locale);
  const sharedCopy = getSharedCopy(locale);

  return createSiteMetadata({
    locale,
    path: "/sound",
    title: copy.page.title,
    description: copy.page.description,
    openGraph: {
      title: formatPageTitle(copy.page.title, sharedCopy.site.name),
      description: copy.page.openGraphDescription,
    },
  });
}

export default async function MusicPage() {
  const locale = await getCurrentSiteLocale();
  const musicWorks = await loadAllMusicWorks();

  return (
    <SoundClient
      copy={getSoundCopy(locale)}
      locale={locale}
      musicWorks={musicWorks}
    />
  );
}
