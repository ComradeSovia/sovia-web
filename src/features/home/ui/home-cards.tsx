import type { HomeCardItem } from "@sovia/home/data/home-cards";
import { Card } from "@sovia/shared";
import { HomeCardArt } from "./home-card-art";

export function HomeCards({ cards }: { cards: ReadonlyArray<HomeCardItem> }) {
  return (
    <div className="home-card-grid">
      {cards.map(({ id, title, subTitle, route, description }, index) => (
        <Card
          key={id}
          title={title}
          serial={String(index + 2).padStart(2, "0")}
          subTitle={subTitle}
          route={route}
          visual={<HomeCardArt kind={id} />}
        >
          <p>{description}</p>
        </Card>
      ))}
    </div>
  );
}
