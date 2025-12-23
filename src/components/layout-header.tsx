import { HammerStarMark } from "./hammer-star-mark";
import { LayoutNav, LayoutNavMobile } from "./layout-nav";

const REQUEST_BUTTON_LABEL = "REQUEST";
const REQUEST_BUTTON_HREF = "/request";

export function LayoutHeader() {
  const requestButton = (
    <a
      href={REQUEST_BUTTON_HREF}
      className="rounded-xl border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-sm font-semibold tracking-widest text-yellow-100 hover:bg-yellow-300/15"
    >
      {REQUEST_BUTTON_LABEL}
    </a>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-yellow-300/20 bg-red-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <HammerStarMark />

        <LayoutNav />

        {requestButton}
      </div>

      <div className="flex border-t border-yellow-300/15 bg-red-950/40 items-center md:hidden">
        <div className="mx-auto max-w-6xl px-6 py-2 text-xs tracking-[0.35em] text-yellow-200/80">
          <LayoutNavMobile />
        </div>
      </div>
    </header>
  );
}
