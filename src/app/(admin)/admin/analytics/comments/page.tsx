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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const params = new URLSearchParams();
  for (const name of [
    "hideOwn",
    "hideReplied",
    "message",
    "page",
    "q",
    "status",
    "category",
    "replyStatus",
    "unlinked",
    "candidate",
    "commentId",
    "comment",
    "action",
  ]) {
    const value = search[name];
    if (typeof value === "string" && value) params.set(name, value);
  }
  const query = params.toString();
  redirect(query ? `/admin/comments?${query}` : "/admin/comments");
}
