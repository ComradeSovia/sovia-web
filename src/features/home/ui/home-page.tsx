import { Routes } from "@sovia/shared";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { createHomePageSchema } from "@sovia/shared/seo/schema";
import Link from "next/link";
import { getHomeCards } from "../data/home-cards";
import type { HomeCopy } from "../i18n/copy";
import { HomeCards } from "./home-cards";
import { HomeHero } from "./home-hero";
import { HomeManifesto } from "./home-manifesto";

export function HomePage({
  copy,
  locale,
  sharedCopy,
}: {
  copy: HomeCopy;
  locale: SiteLocale;
  sharedCopy: SharedCopy;
}) {
  const cards = getHomeCards(copy, sharedCopy, locale);
  const jsonLd = createHomePageSchema(sharedCopy);

  return (
    <section className="home-page">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is generated from local structured data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeHero copy={copy} sharedCopy={sharedCopy} locale={locale} />

      <section
        id="archive"
        className="home-archive"
        aria-labelledby="archive-heading"
      >
        <div className="section-heading">
          <div>
            <span className="meta">SOVIA / 02—07</span>
            <h2 id="archive-heading">{copy.sovietAnime.linksTitle}</h2>
          </div>
          <span className="section-count" aria-hidden="true">
            0{cards.length} ↗
          </span>
        </div>
        <HomeCards cards={cards} />
      </section>

      <HomeManifesto copy={copy} locale={locale} />

      <section
        aria-labelledby="home-contact-heading"
        className="mt-8 grid gap-6 border-t-[3px] border-ink py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      >
        <div className="min-w-0 space-y-3">
          <div className="meta">
            {sharedCopy.contact.letter} / {sharedCopy.contact.song}
          </div>
          <h2 id="home-contact-heading" className="text-3xl sm:text-4xl">
            {sharedCopy.contact.title}
          </h2>
          <p className="max-w-2xl text-base">{sharedCopy.contact.intro}</p>
        </div>
        <Link
          className="btn-outline w-fit"
          href={getSiteLocalizedPath(Routes.Contact.href, locale)}
        >
          {sharedCopy.routes.contact} ↗
        </Link>
      </section>
    </section>
  );
}
