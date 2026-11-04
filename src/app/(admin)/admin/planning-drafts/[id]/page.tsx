import { AdminPlanningDraftPage } from "@sovia/admin/ui/admin-planning-drafts";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review planning draft | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  return (
    <AdminPlanningDraftPage {...(await params)} {...(await searchParams)} />
  );
}
