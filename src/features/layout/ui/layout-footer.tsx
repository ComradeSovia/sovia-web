const FOOTER_TEXT = "Совия Ивановна Рабочева несёт полную ответственность.";
const FOOTER_SLOGAN = "Ритм работы, звук труда";

export function LayoutFooter() {
  return (
    <footer className="border-t-[3px] border-ink bg-block">
      <div className="mx-auto box-border flex w-full max-w-6xl flex-col gap-2 px-4 py-6 md:flex-row md:items-center md:justify-between">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-relief">
          {FOOTER_TEXT}
        </div>
        <div className="bg-red px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-relief">
          {FOOTER_SLOGAN}
        </div>
      </div>
    </footer>
  );
}
