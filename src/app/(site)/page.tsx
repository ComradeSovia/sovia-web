import { HomePage as HomePageContent } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { SITE_DESCRIPTION, SITE_TITLE } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default async function CenterPage() {
  const locale = await getCurrentSiteLocale();

  return (
    <HomePageContent
      copy={getHomeCopy(locale)}
      sharedCopy={getSharedCopy(locale)}
    />
  );
}
