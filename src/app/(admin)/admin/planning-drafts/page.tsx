import { AdminPlanningDraftsPage } from "@sovia/admin/ui/admin-planning-drafts";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Planning drafts | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; request?: string }>;
}) {
  const params = await searchParams;
  return (
    <AdminPlanningDraftsPage
      page={Math.min(
        100000,
        Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
      )}
      requestId={params.request?.slice(0, 300)}
    />
  );
}
