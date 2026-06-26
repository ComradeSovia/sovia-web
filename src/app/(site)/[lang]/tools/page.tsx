import { getSharedCopy } from "@sovia/shared/i18n/copy";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import { ToolsPage } from "@sovia/tools";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type LocalizedToolsParams = Promise<{ lang: string }>;

function getLocale(lang: string) {
  return matchSiteLocale(lang);
}

export async function generateMetadata({
  params,
}: {
  params: LocalizedToolsParams;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    return {};
  }

  const copy = getSharedCopy(locale);

  return {
    title: copy.pages.tools.title,
    description: copy.pages.tools.description,
    alternates: getSiteMetadataAlternates("/tools", locale),
  };
}

export default async function LocalizedToolsPage({
  params,
}: {
  params: LocalizedToolsParams;
}) {
  const { lang } = await params;
  const locale = getLocale(lang);

  if (!locale) {
    notFound();
  }

  if (locale === DEFAULT_SITE_LOCALE) {
    redirect("/tools");
  }

  return <ToolsPage copy={getSharedCopy(locale)} locale={locale} />;
}
