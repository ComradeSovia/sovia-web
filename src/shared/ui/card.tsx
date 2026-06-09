import type { RouteItem } from "../model/nav";

export type CardProps = {
  title: string;
  serial?: string;
  subTitle?: string;
  route?: RouteItem;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function Card({
  title,
  serial,
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
    <span className="btn-primary cursor-not-allowed opacity-60">
      (Coming Soon)
    </span>
  ) : null;

  return (
    <div className="card flex min-h-80 flex-col gap-4">
      <div className="absolute right-0 top-0 h-14 w-20 -skew-x-12 bg-red" />
      <div className="flex items-start justify-between gap-4">
        {subTitleComponent}
        {serial ? (
          <div className="border-ink bg-red text-relief min-w-12 border-3 px-2 py-1 text-center text-2xl font-black leading-none [font-variant-numeric:tabular-nums]">
            {serial}
          </div>
        ) : null}
      </div>
      <h3>{title}</h3>
      <div className="flex-1">{children}</div>
      {disabled ? disabledButtonComponent : buttonComponent}
    </div>
  );
}
