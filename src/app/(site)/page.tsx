import { HomePage as HomePageContent } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    title: copy.site.title,
    description: copy.site.description,
    alternates: getSiteMetadataAlternates("/", locale),
  };
}

export default async function CenterPage() {
  const locale = await getCurrentSiteLocale();

  return (
    <HomePageContent
      copy={getHomeCopy(locale)}
      locale={locale}
      sharedCopy={getSharedCopy(locale)}
    />
  );
}
