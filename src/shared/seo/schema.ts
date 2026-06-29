import { ORGANIZATION_SAME_AS } from "../config/external-links";
import { SITE_URL, siteUrl } from "../config/site";

type GraphNode = Record<string, unknown>;

export type SiteSchemaCopy = {
  site: {
    description: string;
    name: string;
    title: string;
  };
};

export type MusicRecordingSchemaInput = {
  description?: string;
  image?: string;
  original?: string | null;
  path: string;
  series?: string | null;
  title: string;
  u2bId?: string | null;
};

const organizationId = siteUrl("/#organization");
const websiteId = siteUrl("/#website");

function stripUndefined<T extends GraphNode>(node: T) {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => value !== undefined),
  );
}

export function createJsonLd(graph: GraphNode | GraphNode[]) {
  return {
    "@context": "https://schema.org",
    "@graph": Array.isArray(graph) ? graph : [graph],
  };
}

export function createOrganizationSchema(copy: SiteSchemaCopy) {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: copy.site.name,
    alternateName: "Sovia Rabocheva",
    url: SITE_URL,
    sameAs: ORGANIZATION_SAME_AS,
  };
}

export function createWebsiteSchema(copy: SiteSchemaCopy) {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    name: copy.site.name,
    headline: copy.site.title,
    description: copy.site.description,
    url: SITE_URL,
    publisher: {
      "@id": organizationId,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl("/sound")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function createHomePageSchema(copy: SiteSchemaCopy) {
  return createJsonLd([
    createOrganizationSchema(copy),
    createWebsiteSchema(copy),
    {
      "@type": "WebPage",
      "@id": siteUrl("/#webpage"),
      url: SITE_URL,
      name: copy.site.title,
      description: copy.site.description,
      isPartOf: {
        "@id": websiteId,
      },
      about: {
        "@id": organizationId,
      },
    },
  ]);
}

export function createMusicRecordingSchema({
  description,
  image,
  original,
  path,
  series,
  title,
  u2bId,
}: MusicRecordingSchemaInput) {
  const url = siteUrl(`/sound/${path}`);
  const recordingId = `${url}#music-recording`;

  return createJsonLd([
    createOrganizationSchema({
      site: {
        name: "Comrade Sovia",
        title: "Comrade Sovia",
        description: "Comrade Sovia official website.",
      },
    }),
    stripUndefined({
      "@type": "MusicRecording",
      "@id": recordingId,
      name: title,
      description,
      url,
      image,
      byArtist: {
        "@id": organizationId,
      },
      creator: {
        "@id": organizationId,
      },
      inAlbum: series
        ? {
            "@type": "MusicAlbum",
            name: series,
          }
        : undefined,
      isBasedOn: original || undefined,
      sameAs: u2bId ? `https://www.youtube.com/watch?v=${u2bId}` : undefined,
    }),
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      isPartOf: {
        "@id": websiteId,
      },
      mainEntity: {
        "@id": recordingId,
      },
    },
  ]);
}
