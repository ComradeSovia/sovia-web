import { getSoviaLetterColor } from "../lib/letter-colors";

type SoviaCodeProps = {
  code: string;
  template?: string;
};

function renderColoredCode(code: string) {
  const occurrences: Record<string, number> = {};

  return code.split("").map((letter) => {
    occurrences[letter] = (occurrences[letter] ?? 0) + 1;

    return (
      <span
        key={`${letter}-${occurrences[letter]}`}
        style={{ color: getSoviaLetterColor(letter) }}
      >
        {letter}
      </span>
    );
  });
}

export function SoviaCode({ code, template = "{{code}}" }: SoviaCodeProps) {
  const [before = "", after = ""] = template.split("{{code}}");

  return (
    <>
      {before}
      <span className="whitespace-nowrap">{renderColoredCode(code)}</span>
      {after}
    </>
  );
}
