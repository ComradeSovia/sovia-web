export function LayoutMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="rounded-3xl border border-yellow-300/20 bg-red-950/35 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-yellow-300/15 px-7 py-5">
          <div className="text-xs tracking-[0.40em] text-yellow-200/75">
            COMRADE SOVIA
          </div>
          <div className="flex items-center gap-2 text-xs text-yellow-200/70">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-300/70" />
            <span className="tracking-widest">ТРУДЯТСЯ</span>
          </div>
        </div>

        <div className="px-7 py-8">{children}</div>
      </div>
    </main>
  );
}
