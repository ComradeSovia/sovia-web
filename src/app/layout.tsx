import type { Metadata } from "next";
import "./globals.css";
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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getCurrentSiteLocale();

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-full bg-paper font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
