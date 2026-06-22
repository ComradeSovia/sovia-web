import { getNavItems } from "@sovia/shared/constants/nav";
import type { SharedCopy } from "@sovia/shared/i18n/copy";

export function LayoutNav({ copy }: { copy: SharedCopy }) {
  const navItems = getNavItems(copy);

  return (
    <nav className="hidden items-center gap-2 text-sm md:flex">
      {navItems.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="-skew-x-12 border-2 border-ink bg-paper px-4 py-2 font-black uppercase tracking-[0.12em] text-ink shadow-[4px_4px_0_rgb(var(--shadow))] hover-bg-yellow hover-text-block"
        >
          <span className="inline-block skew-x-12">{label}</span>
        </a>
      ))}
    </nav>
  );
}

export function LayoutNavMobile({ copy }: { copy: SharedCopy }) {
  const navItems = getNavItems(copy);

  return (
    <nav className="flex items-center gap-6 text-sm md:hidden">
      {navItems.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="font-black uppercase tracking-[0.12em] text-relief hover-text-yellow"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
