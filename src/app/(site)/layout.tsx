import {
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  RaysBackground,
} from "@sovia/layout";
import { getLayoutCopy } from "@sovia/layout/i18n/copy";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { ReactNode } from "react";

export default async function SiteLayout({ children }: { children: ReactNode }) {
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
      <LayoutMain copy={layoutCopy}>{children}</LayoutMain>
      <LayoutFooter copy={layoutCopy} />
    </div>
  );
}
