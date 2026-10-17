import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { createSiteMetadata } from "@sovia/shared/i18n/metadata";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { ModelViewerPage } from "@sovia/tools";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale).pages.modelViewer;

  return createSiteMetadata({
    locale,
    path: "/tools/model-viewer",
    title: copy.title,
    description: copy.description,
  });
}

export default async function ModelViewerRoute() {
  const locale = await getCurrentSiteLocale();
  return <ModelViewerPage copy={getSharedCopy(locale)} locale={locale} />;
}
