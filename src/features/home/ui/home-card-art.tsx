import Image from "next/image";
import {
  ConstructivistArt,
  type ConstructivistArtVariant,
} from "./constructivist-art";

const cardArt: Readonly<Record<string, ConstructivistArtVariant>> = {
  "lyrics-library": "archive",
  "music-release": "record",
  "concept-design": "structure",
  "video-images": "frames",
  community: "network",
  contact: "envelope",
};

export function HomeCardArt({ kind }: { kind: string }) {
  if (kind === "characters") {
    return (
      <div className="home-card-art" data-kind={kind} aria-hidden="true">
        <span className="art-registration">+</span>
        <div className="home-character-portraits">
          {(["sovia", "kata", "runa", "qi7"] as const).map((id) => (
            <span key={id}>
              <Image
                src={"/assets/characters/" + id + "_main.png"}
                alt=""
                fill
                sizes="(min-width: 1024px) 12vw, 30vw"
              />
            </span>
          ))}
        </div>
        <span className="art-perforation" />
      </div>
    );
  }

  return (
    <div className="home-card-art" data-kind={kind} aria-hidden="true">
      <span className="art-registration">+</span>
      <ConstructivistArt
        variant={cardArt[kind] ?? "structure"}
        className="card-composition"
      />
      <span className="art-perforation" />
    </div>
  );
}
