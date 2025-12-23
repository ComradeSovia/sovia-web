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
    subTitle: "Reconstructed Works",
    route: Routes.Sound,
    description:
      "Original and adapted songs shaped by labor, discipline, and collective voice.",
  },
  {
    disabled: true,
    title: "Gallery",
    subTitle: "Visual Records",
    route: Routes.Gallery,
    description:
      "Promotional artwork and visual records of everyday life in the surrounding world.",
  },
  {
    disabled: true,
    title: "Notice",
    subTitle: "Official Notices",
    route: Routes.Notice,
    description:
      "Project updates, releases, and formally issued progress reports.",
  },
];

export function HomeCards() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {CARDS.map(({ title, subTitle, route, description, disabled }) => (
        <Card
          key={route.href}
          title={title}
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
