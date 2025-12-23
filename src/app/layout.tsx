import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { LayoutFooter } from "@/components/layout-footer";
import { LayoutHeader } from "@/components/layout-header";
import { LayoutMain } from "@/components/layout-main";
import { RaysBackground } from "@/components/rays-background";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sovia",
  description: "Sovia Soviet Style Web",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={[
          inter.className,
          "min-h-full bg-red-900 text-yellow-100 antialiased",
        ].join(" ")}
      >
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
