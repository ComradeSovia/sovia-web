import { SITE_URL } from "@sovia/shared/config/site";
import { ContentLoading } from "@sovia/shared/ui/content-loading";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { type ReactNode, Suspense } from "react";
import "./admin.css";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Sovia Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark h-full ${geist.variable}`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <Suspense fallback={<ContentLoading label="Loading content…" />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
