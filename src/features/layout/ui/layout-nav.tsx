"use client";

import { getNavItems } from "@sovia/shared/constants/nav";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function LayoutNav({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  const navItems = getNavItems(copy, locale);

  return (
    <nav className="site-nav hidden items-center gap-1 text-sm xl:flex">
      {navItems.map((item) => (
        <div key={item.href} className="group relative">
          <Link href={item.href} className="site-nav-link">
            <span className="inline-flex items-center gap-1.5">
              {item.label}
              {item.children ? (
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
                  strokeWidth={3}
                />
              ) : null}
            </span>
          </Link>

          {item.children ? (
            <div className="pointer-events-none absolute left-0 top-full z-30 min-w-48 pt-3 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="border border-ink bg-paper shadow-xl">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="block border-b border-ink px-4 py-3 font-black uppercase tracking-[0.12em] text-ink last:border-b-0 hover-bg-yellow hover-text-block"
                  >
                    {child.label}
                  </Link>
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
  const [isOpen, setIsOpen] = useState(false);
  const navItems = getNavItems(copy, locale);
  const toggleLabel = isOpen ? "Close navigation" : "Open navigation";
  const close = () => setIsOpen(false);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={toggleLabel}
        className="site-menu-toggle"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-6" strokeWidth={3} />
        ) : (
          <Menu aria-hidden="true" className="size-6" strokeWidth={3} />
        )}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 cursor-default bg-black/60"
            onClick={close}
          />

          <nav className="absolute right-0 top-0 flex h-dvh w-[min(20rem,86vw)] flex-col border-l-[3px] border-ink bg-paper shadow-[-8px_0_0_rgb(var(--shadow))]">
            <div className="flex items-center justify-between gap-4 border-b-[3px] border-ink bg-block px-4 py-4 text-relief">
              <div className="min-w-0">
                <div className="text-sm font-black uppercase tracking-[0.16em]">
                  {copy.brand.title}
                </div>
                <div className="mt-1 text-[10px] font-black uppercase leading-snug tracking-[0.1em]">
                  {copy.brand.subtitle}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                className="grid size-10 shrink-0 place-items-center border-[3px] border-relief text-relief hover-bg-yellow hover-text-block"
                onClick={close}
              >
                <X aria-hidden="true" className="size-5" strokeWidth={3} />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-4">
              {navItems.map((item) => (
                <div key={item.href} className="border-b-[3px] border-ink">
                  <Link
                    href={item.href}
                    className="block px-1 py-4 text-lg font-black uppercase tracking-[0.12em] text-ink hover-text-red"
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <div className="mb-4 border-l-[3px] border-red pl-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block py-2 text-sm font-black uppercase tracking-[0.12em] text-ink hover-text-red"
                          onClick={close}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
