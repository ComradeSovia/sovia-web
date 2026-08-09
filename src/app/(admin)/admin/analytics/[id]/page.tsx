import { AdminAnalyticsWorkDetailPage } from "@sovia/admin";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminAnalyticsWorkDetailPage id={decodeURIComponent(id)} />;
}
