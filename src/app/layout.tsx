import type { Metadata } from "next";
import {
  Noto_Sans,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Sans_TC,
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { GoogleAnalytics, SITE_URL } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { ReactNode } from "react";

const notoSans = Noto_Sans({
  display: "swap",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-noto-sans",
});

const notoSansJp = Noto_Sans_JP({
  display: "swap",
  preload: false,
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-noto-sans-jp",
});

const notoSansKr = Noto_Sans_KR({
  display: "swap",
  preload: false,
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-noto-sans-kr",
});

const notoSansSc = Noto_Sans_SC({
  display: "swap",
  preload: false,
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-noto-sans-sc",
});

const notoSansTc = Noto_Sans_TC({
  display: "swap",
  preload: false,
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-noto-sans-tc",
});

const themeInitScript = `
try {
  var theme = window.localStorage.getItem("sovia-theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.dataset.theme = "light";
  }
} catch (_) {}
`;

function getSiteFontVariable(locale: string) {
  switch (locale) {
    case "ja-JP":
      return notoSansJp.variable;
    case "ko-KR":
      return notoSansKr.variable;
    case "zh-CN":
      return notoSansSc.variable;
    case "zh-TW":
      return notoSansTc.variable;
    default:
      return notoSans.variable;
  }
}

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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getCurrentSiteLocale();

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Small inline theme bootstrap avoids an extra render-blocking request.
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${getSiteFontVariable(locale)} min-h-full bg-paper font-sans text-ink antialiased`}
      >
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
