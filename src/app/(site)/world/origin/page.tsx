import { WorldOriginPage } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { WORLD_ORIGIN_PATH } from "@sovia/shared/constants/routes";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import { createWorldOriginPageSchema } from "@sovia/shared/seo/schema";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale).worldOrigin;
  return {
    title: copy.title,
    description: copy.lead,
    alternates: getSiteMetadataAlternates(WORLD_ORIGIN_PATH, locale),
  };
}

export default async function Page() {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale);
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Generated from local Canon and locale data.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            createWorldOriginPageSchema(
              locale,
              copy.worldOrigin.title,
              copy.worldOrigin.lead,
            ),
          ),
        }}
      />
      <WorldOriginPage
        copy={copy.worldOrigin}
        charactersCopy={copy.characters}
        locale={locale}
      />
    </>
  );
}
