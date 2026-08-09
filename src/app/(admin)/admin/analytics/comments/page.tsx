import { AdminAnalyticsCommentsPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audience Comments | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAnalyticsCommentsRoute({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    page?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const { message, page, q, status } = await searchParams;
  return (
    <AdminAnalyticsCommentsPage
      message={message}
      page={page}
      q={q}
      status={status}
    />
  );
}
