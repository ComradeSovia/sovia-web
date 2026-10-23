"use client";

import type { SharedCopy } from "@sovia/shared/i18n/copy";

export function ContentUnavailable({
  copy,
  retry,
}: {
  copy: SharedCopy["unavailable"];
  retry?: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className="mx-auto my-12 w-full max-w-xl rounded-lg border p-6"
    >
      <h1 className="text-xl font-semibold">{copy.title}</h1>
      <p className="mt-3 text-sm opacity-75">{copy.description}</p>
      <button
        type="button"
        className="mt-5 rounded-md border px-4 py-2 text-sm hover:opacity-75"
        onClick={() => (retry ? retry() : window.location.reload())}
      >
        {copy.retry}
      </button>
    </section>
  );
}
