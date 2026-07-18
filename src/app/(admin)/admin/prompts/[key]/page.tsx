import { AdminPromptEditorPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin Prompt",
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function AdminPromptEditorRoute({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    message?: string;
    status?: string;
  }>;
}) {
  const [{ key }, { message, status }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <AdminPromptEditorPage
      message={message}
      promptKey={decodeURIComponent(key)}
      status={status}
    />
  );
}
