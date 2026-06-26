import { getHomeCopy } from "@sovia/home/i18n/copy";
import { AboutSoviaText } from "@sovia/home/ui/about-sovia-text";
import { siteUrl } from "@sovia/shared";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "@sovia/shared/i18n/site-routing";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSiteLocale();
  const copy = getHomeCopy(locale);

  return {
    title: copy.about.metadataTitle,
    description: copy.about.metadataDescription,
    alternates: getSiteMetadataAlternates("/about", locale),
    openGraph: {
      title: copy.about.metadataTitle,
      description: copy.about.metadataDescription,
      url: siteUrl(getSiteLocalizedPath("/about", locale)),
    },
  };
}

export default async function AboutPage() {
  const locale = await getCurrentSiteLocale();
  const localizedCopy = getHomeCopy(locale);

  return (
    <section className="space-y-8">
      <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
        <div className="space-y-4">
          <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
            {localizedCopy.about.eyebrow}
          </div>
          <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
            {localizedCopy.about.serial}
            <br />
            {localizedCopy.about.titleLines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>
        <div>
          <AboutSoviaText copy={localizedCopy} />
        </div>
      </div>
    </section>
  );
}
