import { getRoutes } from "@sovia/shared/constants/routes";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import type { RouteItem } from "@sovia/shared/model/nav";
import type { LayoutCopy } from "../i18n/copy";

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
  copy,
  locale,
  sharedCopy,
}: {
  copy: LayoutCopy;
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
      <div className="mx-auto box-border grid w-full max-w-6xl gap-5 px-4 py-7 text-relief sm:px-6 md:grid-cols-[1.45fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="inline-block bg-red px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
            {sharedCopy.brand.subtitle}
          </div>
          <div>
            <div className="text-lg font-black uppercase tracking-[0.16em]">
              {sharedCopy.site.name}
            </div>
            <p className="mt-2 max-w-sm text-sm font-bold leading-relaxed">
              {copy.footer.description}
            </p>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black uppercase tracking-[0.08em]">
            {archiveLinks.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black uppercase tracking-[0.08em]">
            {channelLinks.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
          </div>
        </div>

        <div className="border-t-2 border-[rgb(var(--relief))] pt-3 text-[10px] font-black uppercase tracking-[0.08em] md:col-span-3">
          © 2026 {sharedCopy.site.name}. {copy.footer.stamp}
        </div>
      </div>
    </footer>
  );
}
