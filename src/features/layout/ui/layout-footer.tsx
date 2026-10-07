import { getRoutes } from "@sovia/shared/constants/routes";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import type { RouteItem } from "@sovia/shared/model/nav";
import Link from "next/link";

function FooterLink({ href, label }: RouteItem) {
  const isExternal = href.startsWith("http");

  if (!isExternal)
    return (
      <Link href={href} className="hover-text-yellow">
        {label}
      </Link>
    );

  return (
    <a
      href={href}
      className="hover-text-yellow"
      rel={isExternal ? "noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {label}
    </a>
  );
}

export function LayoutFooter({
  locale,
  sharedCopy,
}: {
  locale: SiteLocale;
  sharedCopy: SharedCopy;
}) {
  const routes = getRoutes(sharedCopy, locale);
  const archiveLinks = [
    routes.Center,
    routes.Sound,
    routes.Test,
    routes.Tools,
    routes.Notice,
    routes.Contact,
  ];
  const channelLinks = [
    routes.Youtube,
    routes.Discord,
    routes.X,
    routes.VK,
    routes.Bilibili,
    routes.Spotify,
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="footer-wordmark">SOVIA</span>
            <span aria-hidden="true">/</span>
            <span>{sharedCopy.site.name}</span>
            <span aria-hidden="true">/</span>
            <span>© 2026</span>
          </div>
          <div className="mt-3 max-w-72 text-xs font-normal normal-case leading-relaxed tracking-[0.04em]">
            {sharedCopy.brand.subtitle}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          {archiveLinks.map((link) => (
            <FooterLink key={link.href} {...link} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          {channelLinks.map((link) => (
            <FooterLink key={link.href} {...link} />
          ))}
        </div>
      </div>
    </footer>
  );
}
