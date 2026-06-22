import { UnderConstruction } from "@sovia/shared";
import { getDefaultSharedCopy, getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import type { Metadata } from "next";

const copy = getDefaultSharedCopy();

export const metadata: Metadata = {
  title: copy.pages.request.title,
  description: copy.pages.request.description,
  alternates: {
    canonical: "/request",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function RequestPage() {
  const localizedCopy = getSharedCopy(await getCurrentSiteLocale());

  return (
    <UnderConstruction
      copy={localizedCopy}
      title={localizedCopy.pages.request.title}
    />
  );
}
