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

export default async function AdminRoute() {
  return <AdminDashboardPage />;
}
