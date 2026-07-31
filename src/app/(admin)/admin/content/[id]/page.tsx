import { AdminContentEditorPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Content | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminContentDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    action?: string;
    message?: string;
    status?: string;
    step?: string;
  }>;
}) {
  const { id } = await params;
  const { action, message, status, step } = await searchParams;

  return (
    <AdminContentEditorPage
      action={action}
      id={decodeURIComponent(id)}
      message={message}
      status={status}
      step={step}
    />
  );
}
