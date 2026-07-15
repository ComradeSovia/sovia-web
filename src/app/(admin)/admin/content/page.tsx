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
  searchParams: Promise<{ error?: string; message?: string; q?: string }>;
}) {
  const { error, message, q } = await searchParams;

  return <AdminContentListPage error={error} message={message} query={q} />;
}
