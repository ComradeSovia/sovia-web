import Link from "next/link";

export default function AdminNotFound() {
  return (
    <section className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-card-foreground">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Admin page not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This admin address does not exist.
      </p>
      <Link
        className="mt-6 inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        href="/admin"
      >
        Back to dashboard
      </Link>
    </section>
  );
}
