import { AdminReviewInboxPage } from "@sovia/admin/ui/admin-review-inbox";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review inbox | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    page?: string;
    status?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.page || "1", 10) || 1),
  );
  return <AdminReviewInboxPage {...params} page={page} />;
}
