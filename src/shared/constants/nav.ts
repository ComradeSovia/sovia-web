import { getDefaultSharedCopy, type SharedCopy } from "../i18n/copy";
import type { SiteLocale } from "../i18n/site-locale";
import type { RouteItem } from "../model/nav";
import { getRoutes } from "./routes";

export function getNavItems(
  copy: SharedCopy,
  locale?: SiteLocale,
): ReadonlyArray<RouteItem> {
  const routes = getRoutes(copy, locale);

  return [
    { ...routes.Center, label: copy.navigation.home },
    { ...routes.Sound, label: copy.navigation.music },
    {
      ...routes.Characters,
      label: copy.navigation.charactersWorld,
      children: [routes.Characters, routes.WorldOrigin, routes.Gallery],
    },
    {
      ...routes.Tools,
      children: [
        { ...routes.Tools, label: copy.navigation.labOverview },
        routes.Test,
        routes.ModelViewer,
        routes.AirCon,
      ],
    },
    {
      ...routes.About,
      label: copy.navigation.about,
      children: [
        routes.About,
        routes.Creator,
        routes.OpenCulture,
        routes.Usage,
        routes.Contact,
      ],
    },
  ];
}

export const NAV_ITEMS = getNavItems(getDefaultSharedCopy());
