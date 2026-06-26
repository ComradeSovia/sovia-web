import Link from "next/link";
import { Routes } from "../constants/routes";
import { getDefaultSharedCopy, type SharedCopy } from "../i18n/copy";
import type { SiteLocale } from "../i18n/site-locale";
import { DEFAULT_SITE_LOCALE } from "../i18n/site-locale";
import { getSiteLocalizedPath } from "../i18n/site-routing";

export function UnderConstruction({
  copy = getDefaultSharedCopy(),
  locale = DEFAULT_SITE_LOCALE,
  title,
}: {
  copy?: SharedCopy;
  locale?: SiteLocale;
  title: string;
}) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center space-y-10">
      <div className="meta">
        {copy.underConstruction.status}
        <br />
        {copy.underConstruction.description}
      </div>

      <h1>
        «{title.toLocaleUpperCase()}»
        <br />
        {copy.underConstruction.under}
        <br />
        {copy.underConstruction.construction}
      </h1>

      <div className="flex gap-6 pt-4">
        <Link
          href={getSiteLocalizedPath(Routes.Center.href, locale)}
          className="btn-primary"
        >
          {copy.underConstruction.returnLabel}
        </Link>
      </div>

      <p className="meta pt-6">{copy.underConstruction.footer}</p>
    </section>
  );
}
