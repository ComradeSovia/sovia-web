import { Routes } from "@sovia/shared";
import { getDefaultHomeCopy } from "../i18n/copy";

const copy = getDefaultHomeCopy();

function renderHighlightedText(text: string, strongTerms: readonly string[]) {
  const pattern = new RegExp(`(${strongTerms.join("|")})`, "g");

  return text.split(pattern).map((part) => {
    if (strongTerms.includes(part)) {
      return <strong key={part}>{part}</strong>;
    }

    return part;
  });
}

export function HomeManifesto() {
  return (
    <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
      <div className="space-y-4">
        <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
          {copy.manifesto.eyebrow}
        </div>
        <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
          {copy.manifesto.serial}
          <br />
          {copy.manifesto.titleLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <p className="max-w-3xl text-base font-medium leading-relaxed">
          {renderHighlightedText(
            copy.manifesto.text,
            copy.manifesto.strongTerms,
          )}
        </p>
        <a className="btn-primary" href={Routes.About.href}>
          {copy.manifesto.actionLabel}
        </a>
      </div>
    </div>
  );
}
