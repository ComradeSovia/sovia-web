import { Fragment } from "react";
import {
  type PlanningProposal,
  sourceEvidence,
} from "../model/planning-proposals";

export function PlanningSource({
  source,
  proposals,
}: {
  source: string;
  proposals: Pick<PlanningProposal, "key" | "evidenceQuotes">[];
}) {
  const ranges = proposals.flatMap((p) =>
    sourceEvidence(source, p.evidenceQuotes).map((range, index) => ({
      ...range,
      id: `quote-${p.key}-${index}`,
    })),
  );
  const points = [
    ...new Set([
      0,
      source.length,
      ...ranges.flatMap((range) => [range.start, range.end]),
    ]),
  ].sort((a, b) => a - b);
  return (
    <pre
      id="original-source"
      className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded border border-zinc-700 bg-zinc-950 p-4 text-xs leading-6 text-zinc-300"
    >
      {points.slice(0, -1).map((start, index) => (
        <Fragment key={start}>
          {ranges
            .filter((range) => range.start === start)
            .map((range) => (
              <span key={range.id} id={range.id} className="scroll-mt-24" />
            ))}
          {ranges.some(
            (range) => range.start <= start && range.end >= points[index + 1],
          ) ? (
            <mark className="bg-amber-500/20 text-amber-100">
              {source.slice(start, points[index + 1])}
            </mark>
          ) : (
            source.slice(start, points[index + 1])
          )}
        </Fragment>
      ))}
    </pre>
  );
}
