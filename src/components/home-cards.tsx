import { Routes } from "@/constants/routes";
import type { RouteItem } from "@/definitions/nav.def";
import { Card, type CardProps } from "./card";

export type CardItem = {
  title: CardProps["title"];
  subTitle: CardProps["subTitle"];
  route: RouteItem;
  description: string;
  disabled?: boolean;
};

const CARDS: ReadonlyArray<CardItem> = [
  {
    title: "Music",
    subTitle: "Lyrics Archive",
    route: Routes.Sound,
    description:
      "Lyrics for Sovia's remixes, covers, and reconstructed songs, collected for reading and reference.",
  },
  {
    title: "Sovia X",
    subTitle: "Daily Life Images",
    route: Routes.X,
    description:
      "Daily life pictures, visual notes, and image fragments from Sovia's surrounding world.",
  },
  {
    title: "Spotify",
    subTitle: "Original Music",
    route: Routes.Spotify,
    description:
      "A future channel for Sovia's original music, collected as releases become available.",
  },
];

export function HomeCards() {
  return (
    <div className="grid gap-7 md:grid-cols-3">
      {CARDS.map(({ title, subTitle, route, description, disabled }, index) => (
        <Card
          key={route.href}
          title={`${String(index + 2).padStart(2, "0")} ${title}`}
          subTitle={subTitle}
          route={route}
          disabled={disabled}
        >
          <p>{description}</p>
        </Card>
      ))}
    </div>
  );
}
