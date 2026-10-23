"use client";

import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { ContentUnavailable } from "@sovia/shared/ui/content-unavailable";
import { useEffect, useState } from "react";

export default function SiteError({ reset }: { reset: () => void }) {
  const [locale, setLocale] = useState("en-US");

  useEffect(() => {
    setLocale(document.documentElement.lang);
  }, []);

  return (
    <ContentUnavailable
      copy={getSharedCopy(locale).unavailable}
      retry={reset}
    />
  );
}
