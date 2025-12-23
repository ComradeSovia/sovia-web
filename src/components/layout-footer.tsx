const FOOTER_TEXT = "Совия Ивановна Рабочева несёт полную ответственность.";
const FOOTER_SLOGAN = "Ритм работы, звук труда";

export function LayoutFooter() {
  return (
    <footer className="border-t border-yellow-300/15 bg-red-950/55">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div className="text-xs tracking-[0.30em] text-yellow-200/75">
          {FOOTER_TEXT}
        </div>
        <div className="text-xs text-yellow-200/60">{FOOTER_SLOGAN}</div>
      </div>
    </footer>
  );
}
