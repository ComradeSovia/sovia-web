import canon from "../../../data/canon/sovia.json";
import { ORGANIZATION_SAME_AS } from "../config/external-links";
import { SITE_URL, siteUrl } from "../config/site";
import { WORLD_ORIGIN_PATH } from "../constants/routes";
import type { SiteLocale } from "../i18n/site-locale";
import { getSiteLocalizedPath } from "../i18n/site-routing";
import { getCharacterPath } from "./character-path";

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

type CanonCharacterId = keyof typeof canon.entities.characters;

const { project, creator, characters } = canon.entities;
const websiteId = `${canon.canonicalSite}/#website`;

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

export function createProjectSchema() {
  return {
    "@type": "CreativeWork",
    "@id": project["@id"],
    name: project.name,
    alternateName: Object.values(project.localizedNames),
    description: project.description,
    url: project.url,
    creator: { "@id": creator["@id"] },
    character: Object.values(characters).map((character) => ({
      "@id": character["@id"],
    })),
    sameAs: ORGANIZATION_SAME_AS,
  };
}

export function createCreatorSchema() {
  return {
    "@type": "Person",
    "@id": creator["@id"],
    name: creator.name,
    alternateName: Object.values(creator.localizedNames),
    description: creator.description,
    disambiguatingDescription: creator.role,
    url: creator.url,
  };
}

export function createCharacterSchema(id: CanonCharacterId) {
  const character = characters[id];
  return {
    "@type": "Person",
    "@id": character["@id"],
    name: character.name,
    alternateName: [
      ...new Set([
        character.displayName,
        character.nativeName,
        ...Object.values(character.localizedNames),
      ]),
    ],
    description: character.description,
    disambiguatingDescription:
      id === "runa"
        ? characters.runa.identityNote
        : `Fictional character in Comrade Sovia. ${character.identity}`,
    url: character.url,
    image: siteUrl(character.images.portrait),
    identifier: character.identityNumber ?? undefined,
    knowsLanguage: character.languages,
    subjectOf: { "@id": project["@id"] },
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
    publisher: { "@id": creator["@id"] },
    about: { "@id": project["@id"] },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl("/sound")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function createHomePageSchema(copy: SiteSchemaCopy) {
  return createJsonLd([
    createProjectSchema(),
    createCreatorSchema(),
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
        "@id": project["@id"],
      },
    },
  ]);
}

function createPageNode(
  path: string,
  locale: SiteLocale,
  name: string,
  description: string,
  mainEntityId: string,
) {
  const url = siteUrl(getSiteLocalizedPath(path, locale));
  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: locale,
    isPartOf: { "@id": websiteId },
    mainEntity: { "@id": mainEntityId },
  };
}

export function createAboutProjectPageSchema(
  locale: SiteLocale,
  name: string,
  description: string,
) {
  return createJsonLd([
    createProjectSchema(),
    createCreatorSchema(),
    createPageNode("/about", locale, name, description, project["@id"]),
  ]);
}

export function createCreatorPageSchema(
  locale: SiteLocale,
  name: string,
  description: string,
) {
  return createJsonLd([
    createProjectSchema(),
    createCreatorSchema(),
    createPageNode("/creator", locale, name, description, creator["@id"]),
  ]);
}

export function createCharacterPageSchema(
  id: CanonCharacterId,
  locale: SiteLocale,
  name: string,
  description: string,
) {
  return createJsonLd([
    createProjectSchema(),
    createCreatorSchema(),
    createCharacterSchema(id),
    createPageNode(
      getCharacterPath(id),
      locale,
      name,
      description,
      characters[id]["@id"],
    ),
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
    createProjectSchema(),
    createCreatorSchema(),
    stripUndefined({
      "@type": "MusicRecording",
      "@id": recordingId,
      name: title,
      description,
      url,
      image,
      byArtist: {
        "@id": creator["@id"],
      },
      creator: {
        "@id": creator["@id"],
      },
      about: { "@id": project["@id"] },
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

export function createWorldOriginPageSchema(
  locale: SiteLocale,
  name: string,
  description: string,
) {
  return createJsonLd([
    createProjectSchema(),
    createCreatorSchema(),
    createPageNode(
      WORLD_ORIGIN_PATH,
      locale,
      name,
      description,
      project["@id"],
    ),
  ]);
}
