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
    order?: string;
    page?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const { message, order, page, q, sort, status } = await searchParams;
  return (
    <AdminAnalyticsPage
      message={message}
      order={order}
      page={page}
      q={q}
      sort={sort}
      status={status}
    />
  );
}
