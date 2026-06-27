import { Routes } from "../constants/routes";
import { getDefaultSharedCopy, type SharedCopy } from "../i18n/copy";
import { DEFAULT_SITE_LOCALE, type SiteLocale } from "../i18n/site-locale";
import { getSiteLocalizedPath } from "../i18n/site-routing";

export function HammerStarMark({
  copy = getDefaultSharedCopy(),
  locale = DEFAULT_SITE_LOCALE,
}: {
  copy?: SharedCopy;
  locale?: SiteLocale;
}) {
  return (
    <a
      href={getSiteLocalizedPath(Routes.Center.href, locale)}
      className="group min-w-0 max-w-44 shrink text-ink hover-text-ink sm:max-w-56"
    >
      <div className="inline-grid max-w-full grid-cols-[3.25rem_minmax(0,1fr)] items-stretch overflow-hidden border-[3px] border-ink bg-paper shadow-[6px_6px_0_rgb(var(--shadow))] transition-transform group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[4px_4px_0_rgb(var(--red))]">
        <div className="grid place-items-center bg-red text-2xl font-black text-relief">
          *
        </div>
        <div className="min-w-0 px-3 py-2 leading-tight">
          <div className="break-words text-sm font-black tracking-[0.2em]">
            {copy.brand.title}
          </div>
          <div className="break-words text-[10px] font-black uppercase tracking-[0.12em]">
            {copy.brand.subtitle}
          </div>
        </div>
      </div>
    </a>
  );
}
