import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { redirect } from "next/navigation";

export default async function Page() {
  const locale = await getCurrentSiteLocale();
  redirect(getSiteLocalizedPath("/characters/sovia", locale));
}
