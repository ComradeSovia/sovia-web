export type RouteItem = {
  label: string;
  href: string;
  children?: ReadonlyArray<RouteItem>;
};
