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
