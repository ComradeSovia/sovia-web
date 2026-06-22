import { HOME_CARDS, HomeCardPage, getHomeCards } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { SITE_NAME, siteUrl } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

const card = HOME_CARDS[4];

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

export default async function CommunityPage() {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale);
  const cards = getHomeCards(copy, getSharedCopy(locale));

  return <HomeCardPage card={cards[4]} copy={copy} serial="06" />;
}
