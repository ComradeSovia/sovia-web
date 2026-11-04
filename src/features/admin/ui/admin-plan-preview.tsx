"use client";

import type { SharedCopy } from "@sovia/shared/i18n/copy";
import { Check, CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicPlan } from "@/features/song-plans/model";
import { SongPlanCard } from "@/features/song-plans/song-plan-card";
import { VotingProvider } from "@/features/song-plans/vote-button";
import { completionNeedsWork, getPlanReadiness } from "../model/plan-readiness";
import styles from "./admin-plan-preview.module.css";
import { PlanningSubmit } from "./planning-submit";

export function AdminPlanPreview({
  initial,
  copy,
  visible,
  hasPublishedFullWork,
  direction,
  savedStatus,
}: {
  initial: PublicPlan;
  copy: SharedCopy["songPlans"];
  visible: boolean;
  hasPublishedFullWork: boolean;
  direction: string;
  savedStatus: string;
}) {
  const [draft, setDraft] = useState({
    plan: initial,
    visible,
    direction,
    status: savedStatus,
  });
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const form = document.getElementById("production-plan");
    if (!(form instanceof HTMLFormElement)) return;
    const value = (name: string) => {
      const field = form.elements.namedItem(name);
      return field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
        ? field.value
        : "";
    };
    const read = () => {
      setDraft({
        plan: {
          ...initial,
          title: value("title"),
          artist: value("sourceArtists"),
          origin: value("from") === "Contact page" ? null : value("from"),
          summary: value("publicSummary"),
          reference: value("sourceUrl"),
          status:
            value("planStatus") === "CANCELLED"
              ? "PROPOSED"
              : (value("planStatus") as PublicPlan["status"]),
          completedAt:
            value("planStatus") === "COMPLETED" ? initial.completedAt : null,
        },
        visible: value("visible") === "true",
        direction: value("notes"),
        status: value("planStatus"),
      });
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [initial]);
  const checks = getPlanReadiness({
    title: draft.plan.title,
    artist: draft.plan.artist || "",
    origin: draft.plan.origin || "",
    direction: draft.direction,
    summary: draft.plan.summary || "",
    status: draft.status,
    visible: draft.visible,
    hasPublishedFullWork,
    hasPublicWork: draft.plan.works.length > 0,
    wasCompleted: savedStatus === "COMPLETED",
  });
  return (
    <section className="space-y-5" aria-label="Publication preview">
      <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Public card preview</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Theme
            <select
              aria-label="Preview theme"
              className="rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <p className="text-xs leading-6 text-zinc-400">
          Live preview of this form. Saving is still required. Links and support
          buttons are disabled here. The public card uses these same components.
        </p>
        <p className="text-xs text-zinc-400" aria-live="polite">
          {checks.filter((c) => c.level === "blocking").length} blocking issues
          · {checks.filter((c) => c.level === "warning").length} reminders
        </p>
        <p
          className={`text-xs font-medium ${draft.visible && draft.status !== "CANCELLED" ? "text-emerald-300" : "text-amber-300"}`}
        >
          {draft.status === "CANCELLED"
            ? "Cancelled · hidden from the public list"
            : draft.visible
              ? "Public after saving these fields"
              : "Private · preview only"}
        </p>
      </div>
      <div className={styles.paper} data-theme={theme}>
        <VotingProvider>
          {draft.status === "CANCELLED" ? (
            <p className="p-6 text-sm">
              Cancelled plans are not displayed publicly.
            </p>
          ) : (
            <SongPlanCard
              plan={draft.plan}
              locale="en-US"
              copy={copy}
              preview
            />
          )}
        </VotingProvider>
      </div>
      <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold">Before publishing</h2>
        <ul className="space-y-3">
          {checks.map((check) => (
            <li
              key={check.key}
              data-readiness={check.level}
              className={`flex items-start gap-2 text-xs leading-6 ${check.level === "ready" ? "text-zinc-400" : check.level === "blocking" ? "text-red-300" : "text-amber-200"}`}
            >
              {check.level === "ready" ? (
                <Check size={14} className="mt-1 shrink-0" aria-hidden="true" />
              ) : (
                <CircleAlert
                  size={14}
                  className="mt-1 shrink-0"
                  aria-hidden="true"
                />
              )}
              {check.label}
            </li>
          ))}
        </ul>
        <p className="text-xs leading-6 text-zinc-500">
          Missing optional information is a reminder, so historical plans remain
          editable. Completion requirements are also checked on the server when
          saving.
        </p>
      </div>
    </section>
  );
}

export function PlanSaveButton({
  hasPublishedFullWork,
  wasCompleted,
}: {
  hasPublishedFullWork: boolean;
  wasCompleted: boolean;
}) {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const form = document.getElementById("production-plan");
    if (!(form instanceof HTMLFormElement)) return;
    const update = () => {
      const status = form.elements.namedItem("planStatus");
      setBlocked(
        status instanceof HTMLSelectElement &&
          completionNeedsWork(status.value, hasPublishedFullWork, wasCompleted),
      );
    };
    update();
    form.addEventListener("change", update);
    form.addEventListener("input", update);
    return () => {
      form.removeEventListener("change", update);
      form.removeEventListener("input", update);
    };
  }, [hasPublishedFullWork, wasCompleted]);
  return (
    <div className="space-y-3">
      {blocked ? (
        <p className="text-xs leading-6 text-red-300">
          Link a visible, published full-match Work before marking this plan
          complete. Your unsaved edits stay in this form.
        </p>
      ) : null}
      <PlanningSubmit disabled={blocked}>Save plan</PlanningSubmit>
    </div>
  );
}
