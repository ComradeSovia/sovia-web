import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
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
export default async function ContactRoute() {
  return (
    <ContactPage copy={getSharedCopy(await getCurrentSiteLocale()).contact} />
  );
}
