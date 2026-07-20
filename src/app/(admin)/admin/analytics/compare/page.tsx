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

export default async function AdminAnalyticsCompareRoute() {
  return <AdminAnalyticsComparePage />;
}
