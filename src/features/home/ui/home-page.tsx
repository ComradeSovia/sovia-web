import {
  ORGANIZATION_SAME_AS,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteUrl,
} from "@sovia/shared";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import { getHomeCards } from "../data/home-cards";
import type { HomeCopy } from "../i18n/copy";
import { HomeCards } from "./home-cards";
import { HomeHero } from "./home-hero";
import { HomeManifesto } from "./home-manifesto";

export function HomePage({
  copy,
  sharedCopy,
}: {
  copy: HomeCopy;
  sharedCopy: SharedCopy;
}) {
  const cards = getHomeCards(copy, sharedCopy);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: sharedCopy.site.name,
        url: siteUrl("/"),
        sameAs: ORGANIZATION_SAME_AS,
      },
      {
        "@type": "WebSite",
        name: sharedCopy.site.name,
        url: siteUrl("/"),
        description: sharedCopy.site.description,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl("/sound")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <section className="space-y-16">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is generated from local structured data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeHero copy={copy} sharedCopy={sharedCopy} />

      <div className="hr" />

      <HomeCards cards={cards} />

      <div className="hr" />

      <HomeManifesto copy={copy} />
    </section>
  );
}
