import { getRoutes } from "@sovia/shared/constants/routes";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import type { RouteItem } from "@sovia/shared/model/nav";

function FooterLink({ href, label }: RouteItem) {
  const isExternal = href.startsWith("http");

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
    <footer className="border-t-[3px] border-ink bg-block">
      <div className="mx-auto box-border flex w-full max-w-6xl flex-col gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-[0.06em] text-relief sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{sharedCopy.brand.title}</span>
            <span aria-hidden="true">/</span>
            <span>{sharedCopy.site.name}</span>
            <span aria-hidden="true">/</span>
            <span>© 2026</span>
          </div>
          <div className="mt-1 max-w-72 normal-case leading-snug tracking-[0.04em]">
            {sharedCopy.brand.subtitle}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {archiveLinks.map((link) => (
            <FooterLink key={link.href} {...link} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {channelLinks.map((link) => (
            <FooterLink key={link.href} {...link} />
          ))}
        </div>
      </div>
    </footer>
  );
}
