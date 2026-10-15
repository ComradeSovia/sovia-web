import { CreatorPage, getCreatorPageMetadata } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { createCreatorPageSchema } from "@sovia/shared/seo/schema";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  return getCreatorPageMetadata(getHomeCopy(locale), locale);
}

export default async function Page() {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale).creator;
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Generated from local Canon data.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            createCreatorPageSchema(locale, copy.title, copy.lead),
          ),
        }}
      />
      <CreatorPage copy={copy} locale={locale} />
    </>
  );
}
