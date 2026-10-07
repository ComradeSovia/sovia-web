import { SoviaLogo } from "@sovia/shared";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import type { LayoutCopy } from "../i18n/copy";
import { LayoutNav, LayoutNavMobile } from "./layout-nav";
import { SiteLanguageSwitcher } from "./site-language-switcher";
import { ThemeToggle } from "./theme-toggle";

type LayoutHeaderProps = {
  layoutCopy: LayoutCopy;
  locale: SiteLocale;
  sharedCopy: SharedCopy;
};

export function LayoutHeader({
  layoutCopy,
  locale,
  sharedCopy,
}: LayoutHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <SoviaLogo copy={sharedCopy} locale={locale} />
        <LayoutNav copy={sharedCopy} locale={locale} />
        <div className="site-header-controls">
          <SiteLanguageSwitcher copy={layoutCopy} initialLocale={locale} />
          <ThemeToggle />
          <LayoutNavMobile copy={sharedCopy} locale={locale} />
        </div>
      </div>
    </header>
  );
}
