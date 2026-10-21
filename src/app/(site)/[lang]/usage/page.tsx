import { ResourceUsagePage } from "@sovia/home";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getSharedPageMetadata } from "@sovia/shared/i18n/metadata";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = matchSiteLocale(lang);
  if (!locale) return {};
  return getSharedPageMetadata(locale, "usage", "/usage");
}

export default async function LocalizedUsageRoute({ params }: PageProps) {
  const { lang } = await params;
  const locale = matchSiteLocale(lang);
  if (!locale) notFound();
  if (locale === DEFAULT_SITE_LOCALE) redirect("/usage");
  return <ResourceUsagePage copy={getSharedCopy(locale)} locale={locale} />;
}
