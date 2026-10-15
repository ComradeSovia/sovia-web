import { AboutProjectPage, getAboutPageMetadata } from "@sovia/home";
import { getHomeCopy } from "@sovia/home/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { createAboutProjectPageSchema } from "@sovia/shared/seo/schema";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  return getAboutPageMetadata(getHomeCopy(locale), locale);
}

export default async function AboutPage() {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale).about;
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Generated from local Canon data.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            createAboutProjectPageSchema(locale, copy.title, copy.lead),
          ),
        }}
      />
      <AboutProjectPage copy={copy} locale={locale} />
    </>
  );
}
