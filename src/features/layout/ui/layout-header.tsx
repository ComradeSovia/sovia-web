import { HammerStarMark } from "@sovia/shared";
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
  const requestButton = null;
  /*
  const requestButton = (
    <a
      href={REQUEST_BUTTON_HREF}
      className="rounded-xl border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-sm font-semibold tracking-widest text-yellow-100 hover:bg-yellow-300/15"
    >
      {REQUEST_BUTTON_LABEL}
    </a>
  );
  */

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-ink bg-[rgb(var(--paper)/0.9)] backdrop-blur">
      <div className="mx-auto box-border flex w-full max-w-6xl items-center justify-between gap-5 px-4 py-4 sm:px-6">
        <HammerStarMark copy={sharedCopy} />

        <LayoutNav copy={sharedCopy} />

        <div className="flex items-center gap-3">
          <SiteLanguageSwitcher copy={layoutCopy} initialLocale={locale} />
          <ThemeToggle />
          {requestButton}
        </div>
      </div>

      <div className="flex items-center border-t-[3px] border-ink bg-red md:hidden">
        <div className="mx-auto box-border w-full max-w-6xl px-4 py-2 text-xs font-black tracking-[0.16em] text-relief">
          <LayoutNavMobile copy={sharedCopy} />
        </div>
      </div>
    </header>
  );
}
