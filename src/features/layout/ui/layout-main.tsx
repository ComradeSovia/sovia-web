export function LayoutMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="border-[3px] border-ink bg-paper shadow-[14px_14px_0_rgb(var(--shadow))]">
        <div className="grid border-b-[3px] border-ink md:grid-cols-[1fr_auto]">
          <div className="bg-block px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-relief">
            COMRADE SOVIA / CENTRAL PAGE
          </div>
          <div className="flex items-center gap-3 bg-yellow px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-block">
            <span className="inline-block h-3 w-3 bg-red" />
            <span>ARCHIVE / REFORM / SIGNAL</span>
          </div>
        </div>

        <div className="px-5 py-8 sm:px-8 sm:py-10">{children}</div>
      </div>
    </main>
  );
}
