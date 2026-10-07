import { Routes } from "@sovia/shared";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Link from "next/link";
import type { HomeCopy } from "../i18n/copy";

function renderHighlightedText(text: string, strongTerms: readonly string[]) {
  const pattern = new RegExp(`(${strongTerms.join("|")})`, "g");

  return text.split(pattern).map((part) => {
    if (strongTerms.includes(part)) {
      return <strong key={part}>{part}</strong>;
    }

    return part;
  });
}

export function HomeManifesto({
  copy,
  locale,
}: {
  copy: HomeCopy;
  locale: SiteLocale;
}) {
  return (
    <div className="manifesto home-manifesto">
      <div className="space-y-4">
        <div className="meta">{copy.manifesto.eyebrow}</div>
        <h2 className="manifesto-title">
          <span className="manifesto-serial" aria-hidden="true">
            {copy.manifesto.serial} /
          </span>
          {copy.manifesto.titleLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </h2>
      </div>
      <div className="space-y-5">
        <p className="max-w-3xl text-base font-medium leading-relaxed">
          {renderHighlightedText(
            copy.manifesto.text,
            copy.manifesto.strongTerms,
          )}
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            className="btn-primary"
            href={getSiteLocalizedPath(Routes.About.href, locale)}
          >
            {copy.manifesto.actionLabel}
          </Link>
          <Link
            className="btn-outline"
            href={getSiteLocalizedPath("/soviet-anime", locale)}
          >
            {copy.manifesto.sovietAnimeActionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
