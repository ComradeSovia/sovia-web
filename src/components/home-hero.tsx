import { Routes } from "@/constants/routes";

export function HomeHero() {
  return (
    <div className="text-center space-y-6">
      <div className="meta">
        <strong>С</strong>оюз <strong>С</strong>оветской <strong>С</strong>
        тилистической <strong>Р</strong>еконструкции
      </div>

      <h1>
        COMRADE
        <br />
        SOVIA
      </h1>

      <div className="flex flex-wrap justify-center gap-6 pt-6">
        <a href={Routes.Youtube.href} className="btn-primary">
          Browser Our Music in Youtube
        </a>
        <a href={Routes.Sound.href} className="btn-outline">
          Search the lyrics archive
        </a>
      </div>
    </div>
  );
}
