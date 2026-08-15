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
    edit?: string;
    filter?: string;
    message?: string;
    status?: string;
  }>;
}) {
  const { edit, filter, message, status } = await searchParams;
  return (
    <AdminTodoPage
      edit={edit}
      filter={filter}
      message={message}
      status={status}
    />
  );
}
