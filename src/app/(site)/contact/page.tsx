import { SONG_PLANS_PATH } from "@sovia/shared/constants/routes";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "@sovia/shared/i18n/site-routing";
import { ContactPage } from "@/features/contact";
export async function generateMetadata() {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale).contact;
  return {
    title: copy.title,
    description: copy.intro,
    alternates: getSiteMetadataAlternates("/contact", locale),
  };
}
export default async function ContactRoute({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);
  const { kind } = await searchParams;
  return (
    <ContactPage
      copy={copy.contact}
      locale={locale}
      plansCopy={copy.songPlans}
      initialKind={kind === "song" ? "song" : "letter"}
      plansHref={getSiteLocalizedPath(SONG_PLANS_PATH, locale)}
      plansLabel={copy.songPlans.title}
    />
  );
}
