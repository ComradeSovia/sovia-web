import type { RouteItem } from "@/definitions/nav.def";
import { Routes } from "./routes";

export const NAV_ITEMS = [
  Routes.Center,
  Routes.Notice,
  Routes.Sound,
  Routes.Gallery,
  Routes.Report,
] satisfies RouteItem[];
