import { AdminAnalyticsWorkDetailPage } from "@sovia/admin";
import type { CohortKind } from "@sovia/admin/data/analytics-intelligence";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics Work Detail | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAnalyticsWorkDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    hours?: string;
    limit?: string;
    cohort?: string;
    matchDuration?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const hours = [24, 72, 168, 672].includes(Number(query.hours))
    ? Number(query.hours)
    : 168;
  const limit = [10, 20, 50].includes(Number(query.limit))
    ? Number(query.limit)
    : 20;
  const cohort = [
    "recent",
    "sameSourceIp",
    "sameSourceType",
    "sameStyle",
    "sameLanguage",
    "sameVocalLanguage",
    "similarDuration",
  ].includes(query.cohort ?? "")
    ? (query.cohort as CohortKind)
    : "recent";
  return (
    <AdminAnalyticsWorkDetailPage
      id={id}
      hours={hours}
      limit={limit}
      cohort={cohort}
      matchDuration={query.matchDuration === "1"}
    />
  );
}
