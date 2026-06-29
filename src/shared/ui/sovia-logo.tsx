import Image from "next/image";
import iconImage from "@/app/icon.png";
import { Routes } from "../constants/routes";
import { getDefaultSharedCopy, type SharedCopy } from "../i18n/copy";
import { DEFAULT_SITE_LOCALE, type SiteLocale } from "../i18n/site-locale";
import { getSiteLocalizedPath } from "../i18n/site-routing";

export function SoviaLogo({
  copy = getDefaultSharedCopy(),
  locale = DEFAULT_SITE_LOCALE,
}: {
  copy?: SharedCopy;
  locale?: SiteLocale;
}) {
  return (
    <a
      href={getSiteLocalizedPath(Routes.Center.href, locale)}
      aria-label={`${copy.brand.title} - ${copy.brand.subtitle}`}
      className="group shrink-0 text-ink hover-text-ink"
    >
      <div className="grid size-12 place-items-center overflow-hidden border-[3px] border-ink bg-red shadow-[6px_6px_0_rgb(var(--shadow))] transition-transform group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[4px_4px_0_rgb(var(--red))]">
        <Image
          alt=""
          className="size-full object-cover"
          height={48}
          placeholder="blur"
          sizes="48px"
          src={iconImage}
          width={48}
        />
      </div>
    </a>
  );
}
