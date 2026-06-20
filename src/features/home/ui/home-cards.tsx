import { HOME_CARDS } from "@sovia/home/data/home-cards";
import { Card } from "@sovia/shared";

export function HomeCards() {
  return (
    <div className="grid gap-7 md:grid-cols-3">
      {HOME_CARDS.map(({ id, title, subTitle, route, description }, index) => (
        <Card
          key={id}
          title={title}
          serial={String(index + 2).padStart(2, "0")}
          subTitle={subTitle}
          route={route}
        >
          <p>{description}</p>
        </Card>
      ))}
    </div>
  );
}
