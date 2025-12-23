import type { RouteItem } from "@/definitions/nav.def";

export type CardProps = {
  title: string;
  subTitle?: string;
  route?: RouteItem;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function Card({
  title,
  subTitle,
  children,
  route,
  disabled,
}: CardProps) {
  const subTitleComponent = subTitle ? (
    <div className="meta">{subTitle}</div>
  ) : null;

  const buttonComponent = route ? (
    <a href={route.href} className="btn-primary">
      {route.label}
    </a>
  ) : null;

  const disabledButtonComponent = route ? (
    <span className="btn-primary cursor-not-allowed opacity-50">
      (Coming Soon)
    </span>
  ) : null;

  return (
    <div className="card space-y-3 flex flex-col">
      {subTitleComponent}
      <h3>{title}</h3>
      <div className="flex-1">{children}</div>
      {disabled ? disabledButtonComponent : buttonComponent}
    </div>
  );
}
