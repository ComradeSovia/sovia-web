"use client";
import { Button } from "@/components/ui/button";
import type { AdminActionViewProps } from "../actions/views";
import {
  planningPreviewSchema,
  sourceEvidence,
} from "../model/planning-proposals";

export function AdminPlanningProposalActionView({
  action,
  busy,
  execute,
  renderInput,
  run,
  saveOutput,
  consumeOutput,
  fillCurrentForm,
}: AdminActionViewProps) {
  const parsed = planningPreviewSchema.safeParse(run.output);
  const preview = parsed.success ? parsed.data : null;
  return (
    <div className="space-y-4">
      {action.inputs.map(renderInput)}
      <p className="text-xs leading-6 text-zinc-400">
        Generation is a temporary preview. Save a private draft to edit, check
        duplicates and review before adopting any plans. Up to 40,000 source
        characters and 20 proposals per batch.
      </p>
      {run.error ? (
        <p role="alert" className="whitespace-pre-wrap text-sm text-red-300">
          {run.error}
        </p>
      ) : null}
      <Button type="button" disabled={busy} onClick={execute}>
        {busy
          ? "Working…"
          : preview
            ? "Generate again (replaces this preview)"
            : "Generate preview"}
      </Button>
      {preview ? (
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-300">
            {preview.proposals.length} proposals · {preview.sourceName}
          </p>
          {!preview.proposals.length ? (
            <p className="text-sm text-zinc-400">
              No concrete song requests were found. No plan will be created. You
              may save this empty result as a private source record.
            </p>
          ) : null}
          {preview.proposals.map((proposal) => (
            <article
              key={proposal.key}
              className="space-y-3 rounded border border-zinc-800 p-3 text-sm"
            >
              <h3 className="font-semibold">
                {proposal.title}{" "}
                {proposal.sourceArtists ? `· ${proposal.sourceArtists}` : ""}
              </h3>
              <p className="text-xs text-zinc-400">
                {proposal.from || "Original work not supplied"}
              </p>
              <p className="whitespace-pre-wrap">
                <strong>Audience request:</strong>{" "}
                {proposal.requestedChanges ||
                  "No specific adaptation requested."}
              </p>
              <p className="whitespace-pre-wrap">
                <strong>AI production suggestion:</strong> {proposal.notes}
              </p>
              {proposal.missingInfo ? (
                <p className="whitespace-pre-wrap text-amber-300">
                  <strong>Needs confirmation:</strong> {proposal.missingInfo}
                </p>
              ) : null}
              <div className="space-y-2 text-xs text-zinc-400">
                <p>Verified original excerpts</p>
                {sourceEvidence(
                  preview.sourceText,
                  proposal.evidenceQuotes,
                ).map((evidence, index) => (
                  <blockquote
                    key={`${index}-${evidence.start}`}
                    className="whitespace-pre-wrap break-words border-l-2 border-zinc-600 pl-3"
                  >
                    “{evidence.quote}”{" "}
                    <span className="text-zinc-500">
                      [{evidence.start}–{evidence.end}]
                    </span>
                  </blockquote>
                ))}
              </div>
            </article>
          ))}
          <p className="text-xs leading-6 text-zinc-400">
            Saving the same original source again opens its existing draft and
            preserves previous edits. Saving a draft does not approve a request,
            create a plan, or publish anything.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={saveOutput} type="button">
              {run.status === "saving"
                ? "Saving…"
                : "Save private draft and review"}
            </Button>
            {consumeOutput &&
            action.output.applyToForm &&
            preview.proposals.length === 1 ? (
              <Button
                disabled={busy}
                onClick={() => fillCurrentForm()}
                type="button"
                variant="outline"
              >
                Fill current review form (unsaved)
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
