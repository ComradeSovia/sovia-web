import { OPEN_CULTURE_PATH } from "@sovia/shared/constants/routes";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { ArrowUpRight, Camera, Images, Music2 } from "lucide-react";
import Link from "next/link";

import { getOpenCultureCopy } from "../i18n/open-culture/copy";

export function ResourceUsagePage({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  const content = copy.pages.usage;
  const resources = [
    {
      id: "visuals",
      number: "01",
      Icon: Images,
      content: content.visuals,
      href: "/characters",
    },
    {
      id: "cosplay",
      number: "02",
      Icon: Camera,
      content: content.cosplay,
      href: "/gallery/cosplay",
    },
  ];

  return (
    <article className="mx-auto w-full max-w-6xl space-y-14 pb-16 sm:space-y-20">
      <header className="max-w-3xl space-y-5 border-b-[3px] border-ink pb-10">
        <p className="meta">{content.eyebrow}</p>
        <h1 className="text-balance">{content.title}</h1>
        <p className="text-lg leading-relaxed">{content.intro}</p>
        <Link
          href={getSiteLocalizedPath(OPEN_CULTURE_PATH, locale)}
          className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
        >
          {getOpenCultureCopy(locale).title}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section aria-labelledby="usage-summary-title">
        <h2 id="usage-summary-title" className="mb-6">
          {content.summary.title}
        </h2>
        <ol className="grid gap-6 sm:grid-cols-2">
          {content.summary.items.map((item, index) => (
            <li key={item.title} className="min-w-0 border-t-2 border-ink pt-4">
              <span className="meta text-red" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-xl leading-snug">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="usage-resources-title">
        <h2 id="usage-resources-title" className="border-b border-ink pb-5">
          {content.resourcesTitle}
        </h2>
        {resources.map(({ id, number, Icon, content: resource, href }) => (
          <section
            key={number}
            id={id}
            className="grid scroll-mt-28 gap-6 border-b border-ink py-8 lg:grid-cols-[5rem_minmax(0,1fr)] lg:gap-8"
          >
            <div className="flex items-center gap-3 lg:block">
              <span className="meta">{number}</span>
              <Icon className="size-6 lg:mt-3" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl">{resource.title}</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed">
                    {resource.description}
                  </p>
                </div>
                <Link
                  href={getSiteLocalizedPath(href, locale)}
                  className="inline-flex w-fit items-center gap-2 border-b-2 border-ink pb-1 text-sm font-black uppercase tracking-[0.08em] hover-text-red focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {resource.action}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-7 grid gap-7 sm:grid-cols-2 sm:gap-10">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.08em]">
                    {content.allowedLabel}
                  </h4>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-red">
                    {resource.allowed.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.08em]">
                    {content.prohibitedLabel}
                  </h4>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-red">
                    {resource.prohibited.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        ))}
      </section>

      <section aria-labelledby="usage-songs-title">
        <div className="grid gap-5 border-b-[3px] border-ink pb-6 lg:grid-cols-[5rem_minmax(0,1fr)] lg:gap-8">
          <div className="flex items-center gap-3 lg:block">
            <span className="meta">03</span>
            <Music2 className="size-6 lg:mt-3" aria-hidden="true" />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="usage-songs-title">{content.songs.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed">
                {content.songs.description}
              </p>
            </div>
            <Link
              href={getSiteLocalizedPath("/sound", locale)}
              className="inline-flex w-fit items-center gap-2 border-b-2 border-ink pb-1 text-sm font-black uppercase tracking-[0.08em] hover-text-red focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {content.songs.action}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="lg:ml-[7rem]">
          {content.songs.types.map((type, index) => (
            <section key={type.title} className="border-b border-ink py-8">
              <p className="meta">03.{index + 1}</p>
              <h3 className="mt-2 text-2xl">{type.title}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed">
                {type.description}
              </p>
              <div className="mt-6 grid gap-7 sm:grid-cols-2 sm:gap-10">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.08em]">
                    {content.allowedLabel}
                  </h4>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-red">
                    {type.allowed.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                {type.notes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-[0.08em]">
                      {content.notesLabel}
                    </h4>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-red">
                      {type.notes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    </article>
  );
}
