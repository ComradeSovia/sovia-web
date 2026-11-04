export const PLAN_TABS = ["pool", "production", "completed"] as const;
export const PLAN_SORTS = ["recent", "support", "newest"] as const;
export type PlanTab = (typeof PLAN_TABS)[number];
export type PlanSort = (typeof PLAN_SORTS)[number];
export type PublicPlan = {
  id: string;
  title: string;
  artist: string | null;
  origin: string | null;
  reference: string | null;
  summary: string | null;
  status: "PROPOSED" | "PLANNING" | "IN_PRODUCTION" | "PAUSED" | "COMPLETED";
  completedAt: string | null;
  supports: number;
  recent: number;
  supported: boolean;
  requestCount: number;
  works: {
    title: string;
    path: string;
    match: "FULL" | "PARTIAL" | "RELATED";
  }[];
};

export type PublicWorkSuggestion = {
  title: string;
  artist: string | null;
  origin: string | null;
  path: string;
};
export type SongSuggestions = {
  plans: PublicPlan[];
  works: PublicWorkSuggestion[];
};
