import { NAV_ITEMS } from "@/constants/nav";

export function LayoutNav() {
  return (
    <nav className="hidden items-center gap-6 text-sm md:flex">
      {NAV_ITEMS.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="tracking-widest text-yellow-100/90 hover:text-yellow-100"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

export function LayoutNavMobile() {
  return (
    <nav className="flex items-center gap-6 text-sm md:hidden">
      {NAV_ITEMS.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="tracking-widest text-yellow-100/90 hover:text-yellow-100"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
