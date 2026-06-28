import {
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  RaysBackground,
  SiteNotFound,
} from "@sovia/layout";
import { getLayoutCopy } from "@sovia/layout/i18n/copy";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    title: copy.notFound.title,
    description: copy.notFound.description,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function RootNotFound() {
  const locale = await getCurrentSiteLocale();
  const layoutCopy = getLayoutCopy(locale);
  const sharedCopy = getSharedCopy(locale);

  return (
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
  );
}
