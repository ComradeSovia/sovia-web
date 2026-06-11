import { Card, type CardProps, Routes } from "@sovia/shared";
import type { RouteItem } from "@sovia/shared/model/nav";

export type CardItem = {
  id: string;
  title: CardProps["title"];
  subTitle: CardProps["subTitle"];
  route?: RouteItem;
  description: string;
  links?: ReadonlyArray<RouteItem>;
  disabled?: boolean;
};

const CARDS: ReadonlyArray<CardItem> = [
  {
    id: "lyrics-library",
    title: "Lyrics Library",
    subTitle: "Impression Lyrics Archive",
    description:
      "Read the lyrics, song notes, and archive entries for Comrade Sovia works.",
    links: [Routes.LyricsLibrary],
  },
  {
    id: "music-release",
    title: "Music Release",
    subTitle: "Streaming Pages",
    description:
      "Official music releases are collected on the streaming artist pages.",
    links: [Routes.Spotify, Routes.AppleMusic],
  },
  {
    id: "concept-design",
    title: "Concept Design",
    subTitle: "Anime & Realism Styles",
    description:
      "Anime-styled visual work lives on X, while realistic images and polished visual updates live on IG.",
    links: [Routes.X, Routes.Instagram],
  },
  {
    id: "community",
    title: "Community",
    subTitle: "Regional & Discussion Spaces",
    description:
      "Places for discussion, sharing, and the Russian-region community around Sovia.",
    links: [Routes.Reddit, Routes.Discord, Routes.VK],
  },
];

export function HomeCards() {
  return (
    <div className="grid gap-7 md:grid-cols-3">
      {CARDS.map(
        (
          { id, title, subTitle, route, description, links, disabled },
          index,
        ) => (
          <Card
            key={id}
            title={title}
            serial={String(index + 2).padStart(2, "0")}
            subTitle={subTitle}
            route={route}
            disabled={disabled}
          >
            <div className="space-y-5">
              <p>{description}</p>
              {links ? (
                <div className="grid gap-3">
                  {links.map((link) => {
                    const isExternal = link.href.startsWith("http");

                    return (
                      <a
                        className="btn-primary w-full"
                        href={link.href}
                        key={link.href}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        target={isExternal ? "_blank" : undefined}
                      >
                        {link.label}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </Card>
        ),
      )}
    </div>
  );
}
