import { AdminAnalyticsWorksPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics Works | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAnalyticsWorksRoute({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    page?: string;
    sort?: string;
  }>;
}) {
  const { order, page, sort } = await searchParams;
  return <AdminAnalyticsWorksPage order={order} page={page} sort={sort} />;
}
