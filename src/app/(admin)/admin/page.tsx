import { AdminDashboardPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminRoute({
  searchParams,
}: {
  searchParams: Promise<{
    youtubeMessage?: string;
    youtubeStatus?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <AdminDashboardPage
      youtubeMessage={params.youtubeMessage}
      youtubeStatus={params.youtubeStatus}
    />
  );
}
