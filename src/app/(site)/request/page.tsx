import { UnderConstruction } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    title: copy.pages.request.title,
    description: copy.pages.request.description,
    alternates: getSiteMetadataAlternates("/request", locale),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function RequestPage() {
  const locale = await getCurrentSiteLocale();
  const localizedCopy = getSharedCopy(locale);

  return (
    <UnderConstruction
      copy={localizedCopy}
      locale={locale}
      title={localizedCopy.pages.request.title}
    />
  );
}
