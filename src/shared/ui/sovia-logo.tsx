import Image from "next/image";
import Link from "next/link";
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
    <Link
      href={getSiteLocalizedPath(Routes.Center.href, locale)}
      aria-label={`${copy.brand.title} - ${copy.brand.subtitle}`}
      className="site-brand group"
    >
      <div className="site-brand-mark">
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
      <span className="site-brand-wordmark">
        SOVIA<span>{copy.brand.title}</span>
      </span>
    </Link>
  );
}
