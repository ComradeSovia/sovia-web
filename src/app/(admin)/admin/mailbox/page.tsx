import { AdminMailboxPage } from "@sovia/admin/ui/admin-mailbox";
export default async function MailboxRoute({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const value = Number((await searchParams).page || 1);
  const page =
    Number.isSafeInteger(value) && value > 0 && value <= 100000 ? value : 1;
  return <AdminMailboxPage page={page} />;
}
