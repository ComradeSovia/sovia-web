import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { Snowflake, Wrench } from "lucide-react";
import Link from "next/link";

export function ToolsPage({
  copy,
  locale,
}: {
  copy: SharedCopy;
  locale: SiteLocale;
}) {
  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <div className="meta flex items-center gap-2">
          <Wrench className="h-4 w-4" aria-hidden="true" />
          {copy.routes.tools}
        </div>
        <h1 className="max-w-4xl text-balance">{copy.pages.tools.title}</h1>
        <p className="max-w-2xl text-lg">{copy.pages.tools.intro}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <article className="card flex min-h-64 flex-col justify-between gap-8">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center border-[3px] border-ink bg-yellow text-block shadow-[5px_5px_0_rgb(var(--shadow))]">
              <Snowflake className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <h2>{copy.pages.tools.airConTitle}</h2>
              <p>{copy.pages.tools.airConDescription}</p>
            </div>
          </div>

          <Link
            href={getSiteLocalizedPath("/tools/air-con", locale)}
            className="btn-primary w-fit"
          >
            {copy.routes.airCon}
          </Link>
        </article>
      </div>
    </section>
  );
}
