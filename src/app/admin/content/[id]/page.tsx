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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminContentEditorPage id={decodeURIComponent(id)} />;
}
