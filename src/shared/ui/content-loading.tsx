import { LoaderCircle } from "lucide-react";

export function ContentLoading({ label }: { label: string }) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-48 items-center justify-center gap-3 px-6 py-12 text-sm"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-5 shrink-0 motion-safe:animate-spin"
      />
      <p>{label}</p>
    </div>
  );
}
