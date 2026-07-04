import { AdminContentListPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminContentRoute({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { error, q } = await searchParams;

  return <AdminContentListPage error={error} query={q} />;
}
