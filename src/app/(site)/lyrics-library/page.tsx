import { HOME_CARDS, HomeCardPage, getHomeCards } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { SITE_NAME, siteUrl } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

const card = HOME_CARDS[0];

export const metadata: Metadata = {
  title: `${card.title} | ${SITE_NAME}`,
  description: card.pageIntro,
  alternates: {
    canonical: card.route.href,
  },
  openGraph: {
    title: `${card.title} | ${SITE_NAME}`,
    description: card.pageIntro,
    url: siteUrl(card.route.href),
  },
};

export default async function LyricsLibraryPage() {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale);
  const cards = getHomeCards(copy, getSharedCopy(locale));

  return <HomeCardPage card={cards[0]} copy={copy} serial="02" />;
}
