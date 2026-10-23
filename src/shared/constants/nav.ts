import type { SharedCopy } from "../i18n/copy";
import type { SiteLocale } from "../i18n/site-locale";
import type { RouteItem } from "../model/nav";
import { getRoutes, Routes } from "./routes";

export const NAV_ITEMS = [
  Routes.Center,
  // Routes.Notice,
  Routes.Sound,
  {
    ...Routes.Tools,
    children: [Routes.Test, Routes.AirCon, Routes.ModelViewer],
  },
  // Routes.Gallery,
  // Routes.Report,
] satisfies RouteItem[];

export function getNavItems(
  copy: SharedCopy,
  locale?: SiteLocale,
): ReadonlyArray<RouteItem> {
  const routes = getRoutes(copy, locale);

  return [
    routes.Center,
    // routes.Notice,
    routes.Sound,
    {
      ...routes.Tools,
      children: [routes.Test, routes.AirCon, routes.ModelViewer],
    },
    // routes.Gallery,
    // routes.Report,
  ] satisfies RouteItem[];
}
