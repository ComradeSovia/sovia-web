import { AdminRequestsPage } from "@sovia/admin/ui/admin-requests";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Song requests | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q, page } = await searchParams;
  return (
    <AdminRequestsPage
      status={status}
      q={q?.slice(0, 200)}
      page={Math.min(
        100000,
        Math.max(1, Number.parseInt(page ?? "1", 10) || 1),
      )}
    />
  );
}
