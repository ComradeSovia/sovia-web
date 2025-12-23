import { Routes } from "@/constants/routes";

const WEB_SITE_TITLE = "USSR";
const WEB_SITE_TITLE_SUB = "Unit of Soviet Songs Reform";

export function HammerStarMark() {
  return (
    <a href={Routes.Center.href}>
      <div className="inline-flex items-center gap-3">
        <div className="relative h-11 w-11 rounded-full border-2 border-yellow-300/80 bg-red-950/30 shadow">
          <div className="absolute inset-1 rounded-full border border-yellow-300/30" />
          <div className="absolute inset-0 grid place-items-center text-yellow-200">
            <span className="text-[22px] leading-none">★</span>
          </div>
        </div>
        <div className="leading-tight">
          <div className="text-sm tracking-[0.35em] text-yellow-200/90">
            {WEB_SITE_TITLE}
          </div>
          <div className="text-[11px] tracking-[0.30em] text-yellow-200/70">
            {WEB_SITE_TITLE_SUB}
          </div>
        </div>
      </div>
    </a>
  );
}
