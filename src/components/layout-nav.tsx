import { NAV_ITEMS } from "@/constants/nav";

export function LayoutNav() {
  return (
    <nav className="hidden items-center gap-2 text-sm md:flex">
      {NAV_ITEMS.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="-skew-x-12 border-2 border-black bg-[#f4ecd6] px-4 py-2 font-black uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#111] hover:bg-[#f5c400] hover:text-black"
        >
          <span className="inline-block skew-x-12">{label}</span>
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
          className="font-black uppercase tracking-[0.12em] text-[#f4ecd6] hover:text-[#f5c400]"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
