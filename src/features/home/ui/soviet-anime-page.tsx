import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Link from "next/link";
import type { HomeCopy } from "../i18n/copy";

export function SovietAnimePage({
  copy,
  locale,
}: {
  copy: HomeCopy;
  locale: SiteLocale;
}) {
  return (
    <section className="space-y-10">
      <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
        <div className="space-y-4">
          <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
            {copy.sovietAnime.eyebrow}
          </div>
          <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
            {copy.sovietAnime.serial}
            <br />
            {copy.sovietAnime.titleLines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <h1 className="max-w-4xl">{copy.sovietAnime.titleLines.join(" ")}</h1>
          <p className="max-w-3xl text-lg font-medium leading-relaxed">
            {copy.sovietAnime.intro}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {copy.sovietAnime.sections.map((section) => (
          <section
            className="border-t-[3px] border-ink pt-5"
            key={section.title}
          >
            <div className="meta">Archive Note</div>
            <h2 className="mt-3 text-3xl">{section.title}</h2>
            <p className="mt-4 text-base font-medium leading-relaxed">
              {section.text}
            </p>
          </section>
        ))}
      </div>

      <section className="space-y-5 border-y-[3px] border-ink py-6">
        <div className="meta">{copy.sovietAnime.linksTitle}</div>
        <div className="grid gap-5 md:grid-cols-3">
          {copy.sovietAnime.links.map((link) => (
            <Link
              className="card min-h-36"
              href={getSiteLocalizedPath(link.href, locale)}
              key={link.href}
            >
              <div className="absolute right-0 top-0 h-12 w-16 -skew-x-12 bg-red" />
              <div className="relative z-10 space-y-3">
                <h2 className="text-3xl">{link.label}</h2>
                <p className="text-sm font-medium leading-relaxed">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
