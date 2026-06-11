import {
  ORGANIZATION_SAME_AS,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteUrl,
} from "@sovia/shared";
import { HomeCards } from "./home-cards";
import { HomeHero } from "./home-hero";
import { HomeManifesto } from "./home-manifesto";

export function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: siteUrl("/"),
        sameAs: ORGANIZATION_SAME_AS,
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl("/"),
        description: SITE_DESCRIPTION,
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

      <HomeManifesto />

      <div className="hr" />

      <HomeHero />

      <div className="hr" />

      <HomeCards />
    </section>
  );
}
