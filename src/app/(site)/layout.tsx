import {
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  RaysBackground,
} from "@sovia/layout";
import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <RaysBackground />
      <LayoutHeader />
      <LayoutMain>{children}</LayoutMain>
      <LayoutFooter />
    </div>
  );
}
