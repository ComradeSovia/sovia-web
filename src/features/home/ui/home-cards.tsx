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
    id: "visual-design",
    title: "Visual Design",
    subTitle: "Anime & Realistic Styles",
    description:
      "Anime-styled visual work lives on X, while realistic images and polished visual updates live on Instagram.",
    links: [Routes.X, Routes.Instagram],
  },
  {
    id: "distribution",
    title: "Distribution",
    subTitle: "Video & Music Channels",
    description:
      "Published videos and music are distributed across regional video platforms and streaming channels.",
    links: [Routes.Youtube, Routes.VKVideo, Routes.Bilibili, Routes.Spotify],
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
                  {links.map((link) => (
                    <a
                      className="btn-primary w-full"
                      href={link.href}
                      key={link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        ),
      )}
    </div>
  );
}
