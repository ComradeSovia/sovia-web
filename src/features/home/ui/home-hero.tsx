import { Routes } from "@sovia/shared";

export function HomeHero() {
  return (
    <div className="relative overflow-hidden border-[3px] border-ink bg-paper p-5 shadow-[12px_12px_0_rgb(var(--shadow))] sm:p-8">
      <div className="absolute right-[-4rem] top-8 h-10 w-72 -rotate-12 bg-red" />
      <div className="absolute bottom-8 left-[-5rem] h-8 w-72 -rotate-12 bg-yellow" />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-6">
          <div className="meta border-l-[12px] border-red pl-3">
            Department of stylistic reconstruction
          </div>

          <h1 className="max-w-4xl">
            COMRADE
            <br />
            SOVIA
          </h1>

          <div className="border-y-[3px] border-ink py-4">
            <p className="max-w-3xl text-lg font-black uppercase leading-tight tracking-[0.06em] text-ink sm:text-2xl">
              Rhythm of labor, archive of voices, reconstruction of familiar
              sound.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 pt-2">
            <a
              href={Routes.Youtube.href}
              className="btn-primary"
              rel="noopener noreferrer"
              target="_blank"
            >
              {Routes.Youtube.label}
            </a>
            <a
              href={Routes.VKVideo.href}
              className="btn-outline"
              rel="noopener noreferrer"
              target="_blank"
            >
              {Routes.VKVideo.label}
            </a>
            <a
              href={Routes.Bilibili.href}
              className="btn-outline"
              rel="noopener noreferrer"
              target="_blank"
            >
              {Routes.Bilibili.label}
            </a>
          </div>
        </div>

        <div className="relative z-10 grid min-h-56 grid-rows-[1fr_auto] border-[3px] border-ink bg-block text-relief">
          <div className="grid min-h-36 place-items-center bg-red p-6 text-[clamp(4.5rem,14vw,6rem)] font-black leading-none tracking-normal [font-variant-numeric:tabular-nums]">
            01
          </div>
          <div className="space-y-3 border-t-[3px] border-ink bg-block p-5">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-yellow">
              Video Unit
            </div>
            <p className="bg-paper px-3 py-2 text-[13px] font-black uppercase leading-snug tracking-[0.04em] text-ink">
              Watch
              <br />
              videos
              <br />
              across
              <br />
              YouTube
              <br />
              VK
              <br />
              Bilibili.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
