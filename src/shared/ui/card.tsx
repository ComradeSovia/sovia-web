import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { RouteItem } from "../model/nav";

export type CardProps = {
  title: string;
  serial?: string;
  subTitle?: string;
  route?: RouteItem;
  disabled?: boolean;
  children?: React.ReactNode;
  visual?: React.ReactNode;
};

export function Card({
  title,
  serial,
  subTitle,
  children,
  route,
  disabled,
  visual,
}: CardProps) {
  return (
    <div className={visual ? "card card-with-visual" : "card"}>
      {visual}
      <div className="card-topline">
        <span className="card-serial">{serial ?? "↗"}</span>
        <span className="card-motif" aria-hidden="true" />
      </div>
      {subTitle ? <div className="meta">{subTitle}</div> : null}
      <h3>{title}</h3>
      <div className="card-description">{children}</div>
      {route ? (
        <div className="card-action">
          {disabled ? (
            <span aria-disabled="true" className="opacity-50">
              {route.label}
            </span>
          ) : (
            <Link href={route.href} className="card-link">
              <span>{route.label}</span>
              <ArrowUpRight aria-hidden="true" size={20} />
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
