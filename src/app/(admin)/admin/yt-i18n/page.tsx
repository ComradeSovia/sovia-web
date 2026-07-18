import { AdminYoutubeI18nPage } from "@sovia/admin";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <AdminYoutubeI18nPage
      message={params.message ?? params.error}
      status={params.status}
    />
  );
}
