"use client";

import { getNavItems } from "@sovia/shared/constants/nav";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { ChevronDown, Menu, X } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const navItems = getNavItems(copy, locale);
  const toggleLabel = isOpen ? "Close navigation" : "Open navigation";
  const close = () => setIsOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={toggleLabel}
        className="grid size-12 place-items-center border-[3px] border-ink bg-paper text-ink shadow-[5px_5px_0_rgb(var(--shadow))] hover-bg-yellow hover-text-block"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-6" strokeWidth={3} />
        ) : (
          <Menu aria-hidden="true" className="size-6" strokeWidth={3} />
        )}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 cursor-default bg-ink/55"
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
                  <a
                    href={item.href}
                    className="block px-1 py-4 text-lg font-black uppercase tracking-[0.12em] text-ink hover-text-red"
                    onClick={close}
                  >
                    {item.label}
                  </a>
                  {item.children ? (
                    <div className="mb-4 border-l-[3px] border-red pl-4">
                      {item.children.map((child) => (
                        <a
                          key={child.href}
                          href={child.href}
                          className="block py-2 text-sm font-black uppercase tracking-[0.12em] text-ink hover-text-red"
                          onClick={close}
                        >
                          {child.label}
                        </a>
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
