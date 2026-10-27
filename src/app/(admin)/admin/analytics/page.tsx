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
    days?: string;
    start?: string;
    end?: string;
    message?: string;
    order?: string;
    page?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const { days, start, end, message, order, page, q, sort, status } =
    await searchParams;
  return (
    <AdminAnalyticsPage
      days={Number(days) || 28}
      start={start}
      end={end}
      message={message}
      order={order}
      page={page}
      q={q}
      sort={sort}
      status={status}
    />
  );
}
