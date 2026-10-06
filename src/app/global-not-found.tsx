import {
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  RaysBackground,
  SiteNotFound,
} from "@sovia/layout";
import { getLayoutCopy } from "@sovia/layout/i18n/copy";
import { SiteDocument } from "@sovia/layout/ui/site-document";
import { SITE_URL } from "@sovia/shared/config/site";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";
import "./(site)/site.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: copy.notFound.title,
    description: copy.notFound.description,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function GlobalNotFound() {
  const locale = await getCurrentSiteLocale();
  const layoutCopy = getLayoutCopy(locale);
  const sharedCopy = getSharedCopy(locale);

  return (
    <SiteDocument locale={locale}>
      <div className="relative flex min-h-screen flex-col overflow-x-hidden">
        <RaysBackground />
        <LayoutHeader
          layoutCopy={layoutCopy}
          locale={locale}
          sharedCopy={sharedCopy}
        />
        <LayoutMain copy={layoutCopy}>
          <SiteNotFound copy={sharedCopy} locale={locale} />
        </LayoutMain>
        <LayoutFooter locale={locale} sharedCopy={sharedCopy} />
      </div>
    </SiteDocument>
  );
}
