import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { createSiteMetadata } from "@sovia/shared/i18n/metadata";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { ModelViewerPage } from "@sovia/tools";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = matchSiteLocale(lang);
  if (!locale) return {};
  const copy = getSharedCopy(locale).pages.modelViewer;

  return createSiteMetadata({
    locale,
    path: "/lab/model-viewer",
    title: copy.title,
    description: copy.description,
  });
}

export default async function LocalizedModelViewerPage({ params }: PageProps) {
  const { lang } = await params;
  const locale = matchSiteLocale(lang);
  if (!locale) notFound();
  if (locale === DEFAULT_SITE_LOCALE) redirect("/lab/model-viewer");

  return <ModelViewerPage copy={getSharedCopy(locale)} locale={locale} />;
}
