"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ComparisonCandidate,
  ComparisonSong,
} from "../model/review-comparison";
import styles from "./planning-workspace.module.css";

export function DuplicateComparison({
  incoming,
  candidates,
  formId,
  mode,
  proposalKey,
}: {
  incoming: ComparisonSong;
  candidates: ComparisonCandidate[];
  formId: string;
  mode: "request" | "draft" | "comment";
  proposalKey?: string;
}) {
  const [selection, setSelection] = useState("");
  const [message, setMessage] = useState("");
  const candidate =
    candidates.find((c) => `${c.kind}:${c.id}` === selection) ?? candidates[0];
  if (!candidate)
    return (
      <p className="text-xs text-zinc-500">
        No close matches found. This is a suggestion search, not proof that this
        song is new.
      </p>
    );
  const canSelect =
    candidate.selectable !== false &&
    (mode === "comment"
      ? candidate.kind === "request"
      : candidate.kind === "plan" ||
        (mode === "draft" && candidate.kind === "batch"));
  const outcome =
    candidate.kind === "work"
      ? "Review the existing Work. To fulfil this request, link the appropriate version from its production plan."
      : candidate.kind === "batch"
        ? "Use the selected Create/Merge proposal's target plan. Keep its plan fields; preserve this proposal's source as another request. Chains and cycles are blocked."
        : candidate.kind === "request"
          ? "Attach the comment source to this recommendation. Keep its original content, review status and plan links. No new plan is created."
          : "Attach the original request to this plan. Keep its title, artist, production notes, visibility and Work links. A Proposed plan may advance to Planning; completed plans stay completed.";
  function selectTarget() {
    if (!candidate || !canSelect) return;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      setMessage(
        "The edit form is unavailable. Reload before selecting a target.",
      );
      return;
    }
    const targetName = mode === "request" ? "planId" : `target-${proposalKey}`;
    const decisionName =
      mode === "request" ? "decision" : `decision-${proposalKey}`;
    const target = form.elements.namedItem(targetName),
      decision = form.elements.namedItem(decisionName);
    if (
      !(target instanceof HTMLSelectElement) ||
      !(decision instanceof HTMLSelectElement) ||
      !Array.from(target.options).some((o) => o.value === candidate.id)
    ) {
      setMessage(
        "This target is no longer available. Save or reload to refresh the choices.",
      );
      return;
    }
    target.value = candidate.id;
    decision.value =
      mode === "request"
        ? "ACCEPTED"
        : mode === "comment"
          ? "attach"
          : candidate.kind === "batch"
            ? "same"
            : "merge";
    for (const field of [target, decision]) {
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setMessage(
      "Target selected in the edit form. Review and save your changes; nothing has been merged yet.",
    );
  }
  const rows: [string, keyof ComparisonSong][] = [
    ["Song", "title"],
    ["Artist", "artist"],
    ["Original work", "origin"],
    ["Adaptation direction", "direction"],
  ];
  return (
    <section className="space-y-4" aria-label="Duplicate comparison">
      <label className="grid gap-2 text-xs text-zinc-400">
        Compare with
        <select
          className="min-h-10 w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-2 text-zinc-100"
          value={`${candidate.kind}:${candidate.id}`}
          onChange={(e) => {
            setSelection(e.target.value);
            setMessage("");
          }}
        >
          {candidates.map((c) => (
            <option key={`${c.kind}:${c.id}`} value={`${c.kind}:${c.id}`}>
              {c.kind} · {c.title} · {c.artist || "Unknown artist"}
            </option>
          ))}
        </select>
      </label>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-xs leading-6">
          <thead>
            <tr className="border-b border-zinc-700 text-zinc-400">
              <th className="w-1/5 py-2 font-normal">Field</th>
              <th className="px-2 font-normal">Incoming · saved</th>
              <th className="px-2 font-normal">Existing {candidate.kind}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key]) => (
              <tr key={key} className="border-b border-zinc-800 align-top">
                <th className="break-words py-3 font-normal text-zinc-500">
                  {label}
                </th>
                <td className="break-words px-2 py-3">
                  <p className="line-clamp-5 whitespace-pre-wrap">
                    {incoming[key] || "Not recorded"}
                  </p>
                </td>
                <td className="break-words px-2 py-3">
                  <p className="line-clamp-5 whitespace-pre-wrap">
                    {candidate[key] || "Not recorded"}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400">
        {candidate.status.replaceAll("_", " ")}
        {candidate.workSummary ? ` · ${candidate.workSummary}` : ""}
      </p>
      <details className={styles.details}>
        <summary>Read full adaptation directions</summary>
        <div className="grid gap-3 pt-3 text-xs leading-6">
          <p className="whitespace-pre-wrap">
            <strong>Incoming:</strong> {incoming.direction || "Not recorded"}
          </p>
          <p className="whitespace-pre-wrap">
            <strong>Existing:</strong> {candidate.direction || "Not recorded"}
          </p>
        </div>
      </details>
      <div className="space-y-3 rounded border border-zinc-700 bg-zinc-950 p-3">
        <p className="text-xs font-semibold">What this choice does</p>
        <p className="text-xs leading-6 text-zinc-400">{outcome}</p>
        <div className="flex flex-wrap items-center gap-4">
          {canSelect ? (
            <button
              type="button"
              onClick={selectTarget}
              className="rounded border border-zinc-600 px-3 py-2 text-xs font-medium hover:bg-zinc-800"
            >
              Use this {candidate.kind} as target
            </button>
          ) : null}
          <Link
            href={candidate.href}
            className="text-xs text-sky-300 underline"
          >
            Open full record
          </Link>
        </div>
      </div>
      {message ? (
        <output className="text-xs leading-6 text-amber-200">{message}</output>
      ) : null}
      <p className="text-xs text-zinc-500">
        Matching titles alone do not establish the same song. Check artist and
        adaptation direction. Comparisons refresh after saving edits.
      </p>
    </section>
  );
}
