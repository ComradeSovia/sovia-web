import { GoogleAnalytics } from "@sovia/shared";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import {
  Geist,
  Noto_Sans,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Sans_TC,
} from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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

function getSiteFontVariable(locale: SiteLocale) {
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

export function SiteDocument({
  children,
  locale,
}: {
  children: ReactNode;
  locale: SiteLocale;
}) {
  return (
    <html
      lang={locale}
      className={`h-full ${geist.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${getSiteFontVariable(locale)} min-h-full bg-paper text-ink antialiased`}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Small inline theme bootstrap avoids an extra render-blocking request.
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
