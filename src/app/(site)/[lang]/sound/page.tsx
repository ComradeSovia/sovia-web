import { getSharedCopy } from "@sovia/shared/i18n/copy";
import {
  createSiteMetadata,
  formatPageTitle,
} from "@sovia/shared/i18n/metadata";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
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
