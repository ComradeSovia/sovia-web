import { HomeCards } from "@/components/home-cards";
import { HomeHero } from "@/components/home-hero";
import { HomeManifesto } from "@/components/home-manifesto";

export default function HomePage() {
  return (
    <section className="space-y-16">
      <HomeHero />

      <div className="hr" />

      <HomeCards />

      <div className="hr" />

      <HomeManifesto />
    </section>
  );
}
