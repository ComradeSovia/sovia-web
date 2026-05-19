import { Routes } from "@/constants/routes";

const WEB_SITE_TITLE = "USSR";
const WEB_SITE_TITLE_SUB = "Unit of Soviet Songs Reform";

export function HammerStarMark() {
  return (
    <a href={Routes.Center.href} className="group text-black hover:text-black">
      <div className="inline-grid grid-cols-[3.25rem_1fr] items-stretch border-[3px] border-black bg-[#f4ecd6] shadow-[6px_6px_0_#111] transition-transform group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[4px_4px_0_#b91c1c]">
        <div className="grid place-items-center bg-red-700 text-2xl font-black text-[#f4ecd6]">
          *
        </div>
        <div className="px-3 py-2 leading-tight">
          <div className="text-sm font-black tracking-[0.2em]">
            {WEB_SITE_TITLE}
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.12em]">
            {WEB_SITE_TITLE_SUB}
          </div>
        </div>
      </div>
    </a>
  );
}
