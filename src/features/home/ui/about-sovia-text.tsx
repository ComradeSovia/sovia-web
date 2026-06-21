import { getDefaultHomeCopy } from "../i18n/copy";

const copy = getDefaultHomeCopy();

export function AboutSoviaText() {
  return (
    <p className="text-base font-medium leading-relaxed">
      {copy.about.sections.map((section, sectionIndex) => (
        <span key={section.map((part) => part.text).join("")}>
          {section.map((part, partIndex) =>
            part.strong ? (
              <strong key={`${part.text}-${partIndex}`}>{part.text}</strong>
            ) : (
              part.text
            ),
          )}
          {sectionIndex < copy.about.sections.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}
