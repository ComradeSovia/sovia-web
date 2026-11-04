import { AdminPlanDetailPage } from "@sovia/admin/ui/admin-plan-detail";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Music plan | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; message?: string }>;
}) {
  return <AdminPlanDetailPage {...(await params)} {...(await searchParams)} />;
}
