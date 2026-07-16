import { AdminContentListPage } from "@sovia/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminContentRoute({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    order?: string;
    page?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const { error, message, order, page, q, sort } = await searchParams;

  return (
    <AdminContentListPage
      error={error}
      message={message}
      order={order}
      page={page}
      query={q}
      sort={sort}
    />
  );
}
