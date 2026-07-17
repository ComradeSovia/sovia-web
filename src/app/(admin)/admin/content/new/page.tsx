import { AdminContentEditorPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add Content | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminNewContentRoute({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string; step?: string }>;
}) {
  const { message, status, step } = await searchParams;

  return (
    <AdminContentEditorPage message={message} status={status} step={step} />
  );
}
