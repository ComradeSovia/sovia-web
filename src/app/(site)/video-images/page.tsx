import { getHomeCards, HomeCardPage } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { siteUrl } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";

const cardIndex = 3;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const sharedCopy = getSharedCopy(locale);
  const cards = getHomeCards(getHomeCopy(locale), sharedCopy, locale);
  const card = cards[cardIndex];

  return {
    title: `${card.title} | ${sharedCopy.site.name}`,
    description: card.pageIntro,
    alternates: getSiteMetadataAlternates("/video-images", locale),
    openGraph: {
      title: `${card.title} | ${sharedCopy.site.name}`,
      description: card.pageIntro,
      url: siteUrl(card.route.href),
    },
  };
}

export default async function VideoImagesPage() {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale);
  const cards = getHomeCards(copy, getSharedCopy(locale), locale);

  return (
    <HomeCardPage
      card={cards[cardIndex]}
      copy={copy}
      locale={locale}
      serial="05"
    />
  );
}
