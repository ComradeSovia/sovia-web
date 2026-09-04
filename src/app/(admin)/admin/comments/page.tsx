import { AdminCommentsPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comments | Admin",
  robots: { follow: false, index: false },
};

export default async function AdminCommentsRoute({
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
  return <AdminCommentsPage {...(await searchParams)} />;
}
