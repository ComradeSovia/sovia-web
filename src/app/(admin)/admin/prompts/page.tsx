import { AdminPromptsPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin Prompts",
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function AdminPromptsRoute({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    status?: string;
  }>;
}) {
  const { message, status } = await searchParams;

  return <AdminPromptsPage message={message} status={status} />;
}
