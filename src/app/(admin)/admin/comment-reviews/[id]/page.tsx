import { AdminCommentReviewPage } from "@sovia/admin/ui/admin-comment-reviews";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review comment | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  return (
    <AdminCommentReviewPage id={(await params).id} {...(await searchParams)} />
  );
}
