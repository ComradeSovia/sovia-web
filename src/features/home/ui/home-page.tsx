import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { createHomePageSchema } from "@sovia/shared/seo/schema";
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
    </section>
  );
}
