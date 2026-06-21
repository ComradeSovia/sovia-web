import { Routes } from "../constants/routes";
import { getDefaultSharedCopy } from "../i18n/copy";

const copy = getDefaultSharedCopy();

export function HammerStarMark() {
  return (
    <a href={Routes.Center.href} className="group text-ink hover-text-ink">
      <div className="inline-grid grid-cols-[3.25rem_1fr] items-stretch border-[3px] border-ink bg-paper shadow-[6px_6px_0_rgb(var(--shadow))] transition-transform group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[4px_4px_0_rgb(var(--red))]">
        <div className="grid place-items-center bg-red text-2xl font-black text-relief">
          *
        </div>
        <div className="px-3 py-2 leading-tight">
          <div className="text-sm font-black tracking-[0.2em]">
            {copy.brand.title}
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.12em]">
            {copy.brand.subtitle}
          </div>
        </div>
      </div>
    </a>
  );
}
