import type { Metadata } from "next";
import { HomeCards } from "@/components/home-cards";
import { HomeHero } from "@/components/home-hero";
import { HomeManifesto } from "@/components/home-manifesto";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  siteUrl,
} from "@/config/site";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: siteUrl("/"),
        sameAs: [
          "https://www.youtube.com/@ComradeSovia",
          "https://x.com/ComradeSovia",
        ],
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

      <HomeHero />

      <div className="hr" />

      <HomeCards />

      <div className="hr" />

      <HomeManifesto />
    </section>
  );
}
