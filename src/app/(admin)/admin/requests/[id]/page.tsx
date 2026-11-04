import { AdminRequestDetailPage } from "@sovia/admin/ui/admin-requests";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review song request | Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; message?: string }>;
}) {
  return (
    <AdminRequestDetailPage {...(await params)} {...(await searchParams)} />
  );
}
