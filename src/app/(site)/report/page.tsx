import { UnderConstruction } from "@sovia/shared";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getSharedPageMetadata } from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();

  return getSharedPageMetadata(locale, "report", "/report", {
    robots: {
      index: false,
      follow: true,
    },
  });
}

export default async function ReportPage() {
  const locale = await getCurrentSiteLocale();
  const localizedCopy = getSharedCopy(locale);

  return (
    <UnderConstruction
      copy={localizedCopy}
      locale={locale}
      title={localizedCopy.pages.report.title}
    />
  );
}
