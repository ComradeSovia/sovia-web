"use client";

import { ContentUnavailable } from "@sovia/shared/ui/content-unavailable";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <ContentUnavailable
      copy={{
        title: "Content temporarily unavailable",
        description:
          "The content could not be loaded. The database may be offline. Please try again when the connection is restored.",
        retry: "Try again",
      }}
      retry={reset}
    />
  );
}
