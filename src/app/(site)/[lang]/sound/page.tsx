import { getSharedCopy } from "@sovia/shared/i18n/copy";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "@sovia/shared/i18n/site-routing";
import { loadAllMusicWorks, SoundClient } from "@sovia/sound";
import { getSoundCopy } from "@sovia/sound/i18n/copy";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type LocalizedSoundParams = Promise<{ lang: string }>;

function getLocale(lang: string) {
  return matchSiteLocale(lang);
}

export async function generateMetadata({
  params,
}: {
  params: LocalizedSoundParams;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    return {};
  }

  const copy = getSoundCopy(locale);
  const sharedCopy = getSharedCopy(locale);

  return {
    title: copy.page.title,
    description: copy.page.description,
    alternates: getSiteMetadataAlternates("/sound", locale),
    openGraph: {
      title: `${copy.page.title} | ${sharedCopy.site.name}`,
      description: copy.page.openGraphDescription,
      url: getSiteLocalizedPath("/sound", locale),
    },
  };
}

export default async function LocalizedSoundPage({
  params,
}: {
  params: LocalizedSoundParams;
}) {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    notFound();
  }

  if (locale === DEFAULT_SITE_LOCALE) {
    redirect("/sound");
  }

  return (
    <SoundClient
      copy={getSoundCopy(locale)}
      locale={locale}
      musicWorks={await loadAllMusicWorks()}
    />
  );
}
