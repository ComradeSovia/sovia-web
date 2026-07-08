import type { CaptionCue } from "./types";

const TIMESTAMP_PATTERN =
  /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

function parseTimestamp(
  hours: string,
  minutes: string,
  seconds: string,
  milliseconds: string,
) {
  return (
    Number(hours) * 60 * 60 * 1000 +
    Number(minutes) * 60 * 1000 +
    Number(seconds) * 1000 +
    Number(milliseconds)
  );
}

function normalizeCueText(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSrt(input: string): CaptionCue[] {
  return input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.split(/\r?\n/).map((line) => line.trim()))
    .map((lines) => lines.filter(Boolean))
    .flatMap((lines) => {
      const timeLineIndex = lines.findIndex((line) =>
        TIMESTAMP_PATTERN.test(line),
      );

      if (timeLineIndex < 0) {
        return [];
      }

      const match = lines[timeLineIndex].match(TIMESTAMP_PATTERN);

      if (!match) {
        return [];
      }

      const cueText = normalizeCueText(lines.slice(timeLineIndex + 1));

      if (!cueText) {
        return [];
      }

      const parsedIndex = Number(lines[0]);

      return [
        {
          index: Number.isFinite(parsedIndex) ? parsedIndex : 0,
          startMs: parseTimestamp(match[1], match[2], match[3], match[4]),
          endMs: parseTimestamp(match[5], match[6], match[7], match[8]),
          text: cueText,
        },
      ];
    });
}
