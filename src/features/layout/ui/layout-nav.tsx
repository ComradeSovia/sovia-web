import { getNavItems } from "@sovia/shared/constants/nav";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { ChevronDown } from "lucide-react";

export function LayoutNav({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  const navItems = getNavItems(copy, locale);

  return (
    <nav className="hidden items-center gap-2 text-sm md:flex">
      {navItems.map((item) => (
        <div key={item.href} className="group relative">
          <a
            href={item.href}
            className="-skew-x-12 border-2 border-ink bg-paper px-4 py-2 font-black uppercase tracking-[0.12em] text-ink shadow-[4px_4px_0_rgb(var(--shadow))] hover-bg-yellow hover-text-block"
          >
            <span className="inline-flex skew-x-12 items-center gap-1.5">
              {item.label}
              {item.children ? (
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
                  strokeWidth={3}
                />
              ) : null}
            </span>
          </a>

          {item.children ? (
            <div className="pointer-events-none absolute left-0 top-full z-30 min-w-48 pt-3 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="border-2 border-ink bg-paper shadow-[4px_4px_0_rgb(var(--shadow))]">
                {item.children.map((child) => (
                  <a
                    key={child.href}
                    href={child.href}
                    className="block border-b-2 border-ink px-4 py-3 font-black uppercase tracking-[0.12em] text-ink last:border-b-0 hover-bg-yellow hover-text-block"
                  >
                    {child.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

export function LayoutNavMobile({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  const navItems = getNavItems(copy, locale);

  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm md:hidden">
      {navItems.map((item) => (
        <div key={item.href} className="flex flex-col gap-1">
          <a
            href={item.href}
            className="font-black uppercase tracking-[0.12em] text-relief hover-text-yellow"
          >
            {item.label}
          </a>
          {item.children ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-l-2 border-[rgb(var(--relief))] pl-3 text-xs">
              {item.children.map((child) => (
                <a
                  key={child.href}
                  href={child.href}
                  className="font-black uppercase tracking-[0.12em] text-relief hover-text-yellow"
                >
                  {child.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
