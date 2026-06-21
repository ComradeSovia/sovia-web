import type { HomeCardItem } from "@sovia/home/data/home-cards";
import { Routes } from "@sovia/shared";
import { getDefaultHomeCopy } from "../i18n/copy";

const copy = getDefaultHomeCopy();

type HomeCardPageProps = {
  card: HomeCardItem;
  serial: string;
};

export function HomeCardPage({ card, serial }: HomeCardPageProps) {
  return (
    <section className="space-y-10">
      <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
        <div className="space-y-4">
          <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
            {copy.cardPage.eyebrow}
          </div>
          <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
            {serial}
            <br />
            {card.title}
          </div>
        </div>
        <div className="space-y-5">
          <div className="meta">{card.subTitle}</div>
          <h1 className="max-w-4xl">{card.title}</h1>
          <p className="max-w-3xl text-lg font-medium">{card.pageIntro}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {card.links.map((link) => {
          const isExternal = link.href.startsWith("http");

          return (
            <a
              className="card min-h-40"
              href={link.href}
              key={link.href}
              rel={isExternal ? "noopener noreferrer" : undefined}
              target={isExternal ? "_blank" : undefined}
            >
              <div className="absolute right-0 top-0 h-14 w-20 -skew-x-12 bg-red" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                <div>
                  <div className="meta">{copy.cardPage.openChannel}</div>
                  <h2 className="mt-3 text-3xl">{link.label}</h2>
                </div>
                <span className="btn-primary w-fit">
                  {isExternal
                    ? copy.cardPage.openLink
                    : copy.cardPage.enterArchive}
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <a className="btn-outline" href={Routes.Center.href}>
        {copy.cardPage.backToCenter}
      </a>
    </section>
  );
}
