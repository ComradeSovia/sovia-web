import type { Metadata } from "next";
import "./site.css";
import {
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  RaysBackground,
} from "@sovia/layout";
import { getLayoutCopy } from "@sovia/layout/i18n/copy";
import { SiteDocument } from "@sovia/layout/ui/site-document";
import { SITE_URL } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: copy.site.title,
      template: `%s | ${copy.site.name}`,
    },
    description: copy.site.description,
    applicationName: copy.site.name,
    authors: [{ name: copy.site.name, url: SITE_URL }],
    creator: copy.site.name,
    publisher: copy.site.name,
    keywords: copy.site.keywords,
    verification: {
      other: {
        "naver-site-verification": "a0ad7335b3fc1c8d3cbdf5b3542d1e0d60f34f32",
        "yandex-verification": "c8e22422c96ea224",
      },
    },
    alternates: getSiteMetadataAlternates("/", locale),
    openGraph: {
      type: "website",
      locale: locale.replace("-", "_"),
      url: "/",
      siteName: copy.site.name,
      title: copy.site.title,
      description: copy.site.description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: copy.site.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.site.title,
      description: copy.site.description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
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
        <LayoutMain copy={layoutCopy}>{children}</LayoutMain>
        <LayoutFooter locale={locale} sharedCopy={sharedCopy} />
      </div>
    </SiteDocument>
  );
}
