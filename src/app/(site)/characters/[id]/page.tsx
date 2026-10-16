import { CharactersPage } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import type { CharacterId } from "@sovia/home/ui/characters-page";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import { createCharacterPageSchema } from "@sovia/shared/seo/schema";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const characterIds = ["sovia", "kata", "runa", "qi7"] as const;
const characterNames: Record<CharacterId, string> = {
  sovia: "Sovia",
  kata: "Kata",
  runa: "Runa",
  qi7: "QI-7",
};

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
    title: `${characterNames[id]} | ${copy.title}`,
    description: copy.dossiers[id].biography,
    alternates: getSiteMetadataAlternates("/characters/" + id, locale),
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!isCharacterId(id)) notFound();

  const locale = await getCurrentSiteLocale();
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
              `${characterNames[id]} | ${copy.title}`,
              copy.dossiers[id].biography,
            ),
          ),
        }}
      />
      <CharactersPage copy={copy} locale={locale} selectedId={id} />
    </>
  );
}
