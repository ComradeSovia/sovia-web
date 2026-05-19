import { Routes } from "@/constants/routes";

export function HomeHero() {
  return (
    <div className="relative overflow-hidden border-[3px] border-black bg-[#f4ecd6] p-5 shadow-[12px_12px_0_#111] sm:p-8">
      <div className="absolute right-[-4rem] top-8 h-10 w-72 -rotate-12 bg-red-700" />
      <div className="absolute bottom-8 left-[-5rem] h-8 w-72 -rotate-12 bg-[#f5c400]" />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-6">
          <div className="meta border-l-[12px] border-red-700 pl-3">
            Department of stylistic reconstruction
          </div>

          <h1 className="max-w-4xl">
            COMRADE
            <br />
            SOVIA
          </h1>

          <div className="border-y-[3px] border-black py-4">
            <p className="max-w-3xl text-lg font-black uppercase leading-tight tracking-[0.06em] text-black sm:text-2xl">
              Rhythm of labor, archive of voices, reconstruction of familiar
              sound.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 pt-2">
            <a href={Routes.Youtube.href} className="btn-primary">
              Open YouTube
            </a>
            <a href={Routes.Sound.href} className="btn-outline">
              Browse Archive
            </a>
          </div>
        </div>

        <div className="relative z-10 grid min-h-56 grid-rows-[1fr_auto] border-[3px] border-black bg-black text-[#f4ecd6]">
          <div className="grid place-items-center bg-red-700 p-6 text-[6rem] font-black leading-none">
            01
          </div>
          <div className="space-y-3 border-t-[3px] border-black bg-black p-5">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f5c400]">
              Sound Unit
            </div>
            <p className="bg-[#f4ecd6] px-3 py-2 text-[13px] font-black uppercase leading-snug tracking-[0.04em] text-black">
              Familiar
              <br />
              melodies
              <br />
              reorganized
              <br />
              into
              <br />a parallel
              <br />
              industrial choir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
