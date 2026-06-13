import { AboutSoviaText } from "@sovia/home/ui/about-sovia-text";
import { SITE_NAME, siteUrl } from "@sovia/shared";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `About Sovia | ${SITE_NAME}`,
  description:
    "About Sovia Rabocheva and the reconstruction of familiar songs through another world.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `About Sovia | ${SITE_NAME}`,
    description:
      "About Sovia Rabocheva and the reconstruction of familiar songs through another world.",
    url: siteUrl("/about"),
  },
};

export default function AboutPage() {
  return (
    <section className="space-y-8">
      <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
        <div className="space-y-4">
          <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
            About Our Department
          </div>
          <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
            00
            <br />
            About
            <br />
            Sovia
          </div>
        </div>
        <div>
          <AboutSoviaText />
        </div>
      </div>
    </section>
  );
}
