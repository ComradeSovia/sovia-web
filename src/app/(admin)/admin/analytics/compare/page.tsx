import { AdminAnalyticsComparePage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics Compare | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAnalyticsCompareRoute({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[]; metric?: string }>;
}) {
  const query = await searchParams;
  const ids = (
    Array.isArray(query.ids) ? query.ids : query.ids ? [query.ids] : []
  )
    .filter(Boolean)
    .slice(0, 5);
  return <AdminAnalyticsComparePage ids={ids} metric={query.metric} />;
}
