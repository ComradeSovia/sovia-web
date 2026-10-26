"use client";

import { getNavItems } from "@sovia/shared/constants/nav";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export function LayoutNav({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  const navItems = getNavItems(copy, locale);
  const [openHref, setOpenHref] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuId = useId();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !navRef.current?.contains(event.target)
      ) {
        setOpenHref(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        event.target instanceof Element &&
        navRef.current?.contains(event.target)
      ) {
        setOpenHref(null);
        event.target
          .closest("[data-nav-group]")
          ?.querySelector("button")
          ?.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const openGroup = navRef.current
        ?.querySelector('[aria-expanded="true"]')
        ?.closest("[data-nav-group]");
      if (
        event.target instanceof Node &&
        openGroup &&
        !openGroup.contains(event.target)
      )
        setOpenHref(null);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label={copy.navigation.mainLabel}
      className="site-nav hidden items-center gap-1 text-sm xl:flex"
    >
      {navItems.map((item, index) => (
        <div key={item.href} className="relative" data-nav-group>
          {item.children ? (
            <>
              <button
                type="button"
                className="site-nav-link"
                aria-expanded={openHref === item.href}
                aria-controls={`${menuId}-${index}`}
                onClick={() =>
                  setOpenHref(openHref === item.href ? null : item.href)
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {item.label}
                  <ChevronDown
                    aria-hidden="true"
                    className={
                      openHref === item.href
                        ? "size-3.5 rotate-180"
                        : "size-3.5"
                    }
                    strokeWidth={3}
                  />
                </span>
              </button>
              <div
                id={`${menuId}-${index}`}
                hidden={openHref !== item.href}
                className="absolute right-0 top-full z-30 w-max min-w-48 max-w-72 pt-3"
              >
                <div className="border border-ink bg-paper shadow-xl">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpenHref(null)}
                      className="block border-b border-ink px-4 py-3 font-black uppercase tracking-[0.12em] text-ink last:border-b-0 hover-bg-yellow hover-text-block focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Link href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          )}
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
  const toggleLabel = isOpen
    ? copy.navigation.closeMenu
    : copy.navigation.openMenu;
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
            aria-label={copy.navigation.closeMenu}
            className="absolute inset-0 cursor-default bg-black/60"
            onClick={close}
          />

          <nav
            aria-label={copy.navigation.mainLabel}
            className="absolute right-0 top-0 flex h-dvh w-[min(20rem,86vw)] flex-col border-l-[3px] border-ink bg-paper shadow-[-8px_0_0_rgb(var(--shadow))]"
          >
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
                aria-label={copy.navigation.closeMenu}
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
