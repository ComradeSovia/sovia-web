import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { ArrowLeft, Box } from "lucide-react";
import Link from "next/link";
import { VrmViewer } from "./vrm-viewer";

export function ModelViewerPage({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  const content = copy.pages.modelViewer;

  return (
    <section className="space-y-8">
      <div className="space-y-5">
        <Link
          href={getSiteLocalizedPath("/tools", locale)}
          className="meta inline-flex items-center gap-2 underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {copy.routes.tools}
        </Link>
        <div className="meta flex items-center gap-2">
          <Box className="h-4 w-4" aria-hidden="true" />
          {content.eyebrow}
        </div>
        <h1 className="max-w-4xl text-balance">{content.title}</h1>
        <p className="max-w-2xl text-lg">{content.intro}</p>
      </div>

      <VrmViewer copy={content} />
    </section>
  );
}
