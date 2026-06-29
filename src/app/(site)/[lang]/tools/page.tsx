import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getSharedPageMetadata } from "@sovia/shared/i18n/metadata";
import {
  DEFAULT_SITE_LOCALE,
  matchSiteLocale,
} from "@sovia/shared/i18n/site-locale";
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

  return getSharedPageMetadata(locale, "tools", "/tools");
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
