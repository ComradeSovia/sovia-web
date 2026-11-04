import { AdminCommentReviewsPage } from "@sovia/admin/ui/admin-comment-reviews";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Comment reviews | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  return (
    <AdminCommentReviewsPage
      page={Math.max(1, Number.parseInt(params.page || "1", 10) || 1)}
    />
  );
}
