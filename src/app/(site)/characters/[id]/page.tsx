import { CharactersPage } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import type { CharacterId } from "@sovia/home/ui/characters-page";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const characterIds = ["sovia", "kata", "runa"] as const;

type PageProps = { params: Promise<{ id: string }> };

function isCharacterId(value: string): value is CharacterId {
  return characterIds.some((id) => id === value);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isCharacterId(id)) notFound();

  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale).characters;
  return {
    title: id[0].toUpperCase() + id.slice(1) + " | " + copy.title,
    description: copy.dossiers[id].biography,
    alternates: getSiteMetadataAlternates("/characters/" + id, locale),
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!isCharacterId(id)) notFound();

  const locale = await getCurrentSiteLocale();
  return (
    <CharactersPage
      copy={getHomeCopy(locale).characters}
      locale={locale}
      selectedId={id}
    />
  );
}
