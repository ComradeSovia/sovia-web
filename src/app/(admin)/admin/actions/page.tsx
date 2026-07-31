import { AdminActionsPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actions | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminActionsRoute() {
  return <AdminActionsPage />;
}
