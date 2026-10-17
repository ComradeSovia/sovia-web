import { getGalleryCopy } from "@sovia/gallery/i18n/copy";
import { CharactersPage } from "@sovia/home";
import { getCharacterDisplayName } from "@sovia/home/data/character-names";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import type { CharacterId } from "@sovia/home/ui/characters-page";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "@sovia/shared/i18n/site-routing";
import { getCharacterPath } from "@sovia/shared/seo/character-path";
import { createCharacterPageSchema } from "@sovia/shared/seo/schema";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

const characterIds = ["sovia", "kata", "runa", "qi7"] as const;
type PageProps = { params: Promise<{ id: string }> };

function getCharacterId(value: string): CharacterId | null {
  if (value === "katya") return "kata";
  return characterIds.find((id) => id === value) ?? null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: slug } = await params;
  const id = getCharacterId(slug);
  if (!id) notFound();

  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale).characters;
  return {
    title: `${getCharacterDisplayName(id, locale)} | ${copy.title}`,
    description: copy.dossiers[id].biography,
    alternates: getSiteMetadataAlternates(getCharacterPath(id), locale),
  };
}

export default async function Page({ params }: PageProps) {
  const { id: slug } = await params;
  const id = getCharacterId(slug);
  if (!id) notFound();

  const locale = await getCurrentSiteLocale();
  if (slug === "kata")
    permanentRedirect(getSiteLocalizedPath(getCharacterPath(id), locale));
  const copy = getHomeCopy(locale).characters;
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Generated from local Canon data.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            createCharacterPageSchema(
              id,
              locale,
              `${getCharacterDisplayName(id, locale)} | ${copy.title}`,
              copy.dossiers[id].biography,
            ),
          ),
        }}
      />
      <CharactersPage
        copy={copy}
        cosplayCopy={getGalleryCopy(locale)}
        modelViewerCopy={getSharedCopy(locale).pages.modelViewer}
        locale={locale}
        selectedId={id}
      />
    </>
  );
}
