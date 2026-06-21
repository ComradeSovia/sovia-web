import { getDefaultHomeCopy } from "@sovia/home/i18n/copy";
import { AboutSoviaText } from "@sovia/home/ui/about-sovia-text";
import { siteUrl } from "@sovia/shared";
import type { Metadata } from "next";

const copy = getDefaultHomeCopy();

export const metadata: Metadata = {
  title: copy.about.metadataTitle,
  description: copy.about.metadataDescription,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: copy.about.metadataTitle,
    description: copy.about.metadataDescription,
    url: siteUrl("/about"),
  },
};

export default function AboutPage() {
  return (
    <section className="space-y-8">
      <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
        <div className="space-y-4">
          <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
            {copy.about.eyebrow}
          </div>
          <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
            {copy.about.serial}
            <br />
            {copy.about.titleLines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>
        <div>
          <AboutSoviaText />
        </div>
      </div>
    </section>
  );
}
