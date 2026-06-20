import { HOME_CARDS, HomeCardPage } from "@sovia/home";
import { SITE_NAME, siteUrl } from "@sovia/shared";
import type { Metadata } from "next";

const card = HOME_CARDS[3];

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

export default function VideoImagesPage() {
  return <HomeCardPage card={card} serial="05" />;
}
