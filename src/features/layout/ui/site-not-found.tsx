import { Routes } from "@sovia/shared";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Link from "next/link";

export function SiteNotFound({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center space-y-10 text-center">
      <div className="meta">
        {copy.notFound.status}
        <br />
        {copy.notFound.description}
      </div>

      <h1>
        {copy.notFound.title}
        <br />
        {copy.notFound.lineOne}
        <br />
        {copy.notFound.lineTwo}
      </h1>

      <div className="flex gap-6 pt-4">
        <Link
          href={getSiteLocalizedPath(Routes.Center.href, locale)}
          className="btn-primary"
        >
          {copy.notFound.returnLabel}
        </Link>
      </div>

      <p className="meta pt-6">{copy.notFound.footer}</p>
    </section>
  );
}
