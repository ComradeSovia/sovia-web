"use client";
import { type ReactNode, useState } from "react";
import { PlanningSubmit } from "./planning-submit";

export function PlanningAdoptForm({
  action,
  children,
  confirmation = "I reviewed the saved proposals, source excerpts, missing information and duplicate choices. Adopt selected proposals as private plans or attach them to existing plans.",
  buttonLabel = "Review complete — adopt saved draft",
  nextLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  children: ReactNode;
  confirmation?: string;
  buttonLabel?: string;
  nextLabel?: string;
}) {
  const [error, setError] = useState("");
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (document.querySelector('form[data-admin-dirty="true"]')) {
          event.preventDefault();
          setError("Save your draft edits before adopting the saved version.");
        } else setError("");
      }}
      className="space-y-4"
    >
      {children}
      <label className="flex items-start gap-3 text-sm">
        <input
          name="confirmed"
          type="checkbox"
          required
          className="mt-1 size-4"
        />
        {confirmation}
      </label>
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <PlanningSubmit>{buttonLabel}</PlanningSubmit>
        {nextLabel ? <PlanningSubmit next>{nextLabel}</PlanningSubmit> : null}
      </div>
    </form>
  );
}
