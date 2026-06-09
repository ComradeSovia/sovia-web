import type { Metadata } from "next";
import "./globals.css";
import {
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  RaysBackground,
} from "@sovia/layout";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@sovia/shared";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-full bg-paper font-sans text-ink antialiased">
        <div className="relative min-h-screen overflow-hidden">
          <RaysBackground />
          <LayoutHeader />
          <LayoutMain>{children}</LayoutMain>
          <LayoutFooter />
        </div>
      </body>
    </html>
  );
}
