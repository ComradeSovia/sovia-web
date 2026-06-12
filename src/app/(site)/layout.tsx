import {
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  RaysBackground,
} from "@sovia/layout";
import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <RaysBackground />
      <LayoutHeader />
      <LayoutMain>{children}</LayoutMain>
      <LayoutFooter />
    </div>
  );
}
