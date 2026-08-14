import { AdminTodoPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Todo | Admin",
  robots: { follow: false, index: false },
};

export default async function AdminTodoRoute({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    message?: string;
    status?: string;
  }>;
}) {
  const { filter, message, status } = await searchParams;
  return <AdminTodoPage filter={filter} message={message} status={status} />;
}
