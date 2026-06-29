import {
  getHomeCardPageMetadata,
  getHomeCards,
  HomeCardPage,
} from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

const cardIndex = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const sharedCopy = getSharedCopy(locale);
  const cards = getHomeCards(getHomeCopy(locale), sharedCopy, locale);
  const card = cards[cardIndex];

  return getHomeCardPageMetadata(card, sharedCopy, locale);
}

export default async function LyricsLibraryPage() {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale);
  const cards = getHomeCards(copy, getSharedCopy(locale), locale);

  return (
    <HomeCardPage
      card={cards[cardIndex]}
      copy={copy}
      locale={locale}
      serial="02"
    />
  );
}
