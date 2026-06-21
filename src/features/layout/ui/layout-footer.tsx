import { getDefaultLayoutCopy } from "../i18n/copy";

const copy = getDefaultLayoutCopy();

export function LayoutFooter() {
  return (
    <footer className="border-t-[3px] border-ink bg-block">
      <div className="mx-auto box-border flex w-full max-w-6xl flex-col gap-2 px-4 py-6 md:flex-row md:items-center md:justify-between">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-relief">
          {copy.footer.text}
        </div>
        <div className="bg-red px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-relief">
          {copy.footer.slogan}
        </div>
      </div>
    </footer>
  );
}
