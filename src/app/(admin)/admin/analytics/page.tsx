import { AdminAnalyticsPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YouTube Analytics | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAnalyticsRoute({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    status?: string;
  }>;
}) {
  const { message, status } = await searchParams;
  return <AdminAnalyticsPage message={message} status={status} />;
}
