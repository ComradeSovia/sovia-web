import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
    hideOwn?: string;
    hideReplied?: string;
    page?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const { hideOwn, hideReplied, message, page, q, status } = await searchParams;
  const params = new URLSearchParams();
  if (hideOwn) params.set("hideOwn", hideOwn);
  if (hideReplied) params.set("hideReplied", hideReplied);
  if (message) params.set("message", message);
  if (page) params.set("page", page);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const query = params.toString();
  redirect(query ? `/admin/comments?${query}` : "/admin/comments");
}
