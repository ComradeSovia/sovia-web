import type { RouteItem } from "@/definitions/nav.def";

export type CardProps = {
  title: string;
  subTitle?: string;
  route?: RouteItem;
  children?: React.ReactNode;
};

export function Card({ title, subTitle, children, route }: CardProps) {
  const subTitleComponent = subTitle ? (
    <div className="meta">{subTitle}</div>
  ) : null;

  const buttonComponent = route ? (
    <a href={route.href} className="btn-primary">
      {route.label}
    </a>
  ) : null;

  return (
    <div className="card space-y-3 flex flex-col">
      {subTitleComponent}
      <h3>{title}</h3>
      <div className="flex-1">{children}</div>
      {buttonComponent}
    </div>
  );
}
