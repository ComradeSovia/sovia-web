import { SiteNotFound } from "@sovia/layout";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";

export default async function NotFound() {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale);

  return <SiteNotFound copy={copy} locale={locale} />;
}
