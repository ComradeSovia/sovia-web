"use client";

import { Archive, CircleHelp, Clock3, Link2, Music2, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { reviewRequestAction } from "../planning-actions";
import { AdminDirtyForm } from "./admin-step-panels";

const choices = [
  {
    key: "create",
    status: "ACCEPTED",
    label: "Create a private plan",
    icon: Music2,
  },
  {
    key: "attach",
    status: "ACCEPTED",
    label: "Use an existing plan",
    icon: Link2,
  },
  {
    key: "needsInfo",
    status: "NEEDS_INFO",
    label: "Needs information",
    icon: CircleHelp,
  },
  { key: "pending", status: "PENDING", label: "Keep pending", icon: Clock3 },
  { key: "decline", status: "REJECTED", label: "Decline", icon: X },
  { key: "archive", status: "ARCHIVED", label: "Archive", icon: Archive },
] as const;

type Choice = (typeof choices)[number]["key"];
type PlanOption = {
  id: string;
  title: string;
  artist: string | null;
  status: string;
  visible: boolean;
  updatedAt: string;
};
const draftLabels = {
  title: "Plan title",
  sourceArtists: "Source artists",
  from: "Original work",
  sourceUrl: "Reference URL",
  notes: "Production direction",
} as const;

export function RequestPlanSearch({
  id,
  query,
  count,
}: {
  id: string;
  query: string;
  count: number;
}) {
  const pinned = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Form
        action={`/admin/requests/${encodeURIComponent(id)}`}
        replace
        scroll={false}
        className="flex flex-wrap gap-3"
        onSubmit={() => {
          const editor = document.getElementById("request-review");
          const field =
            editor instanceof HTMLFormElement
              ? editor.elements.namedItem("planId")
              : null;
          if (pinned.current && field instanceof HTMLSelectElement) {
            pinned.current.value = field.value;
            pinned.current.disabled = !field.value;
          }
        }}
      >
        <input
          type="hidden"
          name="selectedPlan"
          ref={pinned}
          defaultValue=""
          disabled
        />
        <input
          aria-label="Find existing plan"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={200}
          placeholder="Find another plan by title"
          className="min-w-0 rounded border border-zinc-700 bg-zinc-950 p-2"
        />
        <button type="submit" className="rounded border border-zinc-700 px-3">
          Find plans
        </button>
      </Form>
      {query ? (
        <output className="block text-xs text-zinc-400">
          {count === 50
            ? "First 50 results"
            : `${count} matching ${count === 1 ? "plan" : "plans"}`}{" "}
          for “{query}” in the existing plan picker. Your edits are kept.
        </output>
      ) : null}
    </div>
  );
}

function readDecision(
  form: HTMLFormElement,
  choice: Choice,
  plans: PlanOption[],
) {
  const data = new FormData(form);
  const read = (name: string) => String(data.get(name) ?? "").trim();
  return {
    choice,
    reviewNotes: read("reviewNotes"),
    plan:
      choice === "attach"
        ? (plans.find((item) => item.id === read("planId")) ?? null)
        : null,
    draft: Object.entries(draftLabels).map(([name, label]) => ({
      label,
      value: read(name),
    })),
  };
}

export function RequestDecision({
  id,
  updatedAt,
  title,
  status,
  linkedIds,
  plans,
  skipHref,
  planFields,
  targetField,
  notesField,
}: {
  id: string;
  updatedAt: string;
  title: string;
  status: string;
  linkedIds: string[];
  plans: PlanOption[];
  skipHref: string;
  planFields: ReactNode;
  targetField: ReactNode;
  notesField: ReactNode;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [planId, setPlanId] = useState(
    linkedIds.find((key) => plans.some((plan) => plan.id === key)) ?? "",
  );
  const [preview, setPreview] = useState<ReturnType<
    typeof readDecision
  > | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const targetGroup = useRef<HTMLFieldSetElement>(null);
  const [missingTarget, setMissingTarget] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const confirmIntent = useRef(false);
  const nextField = useRef<HTMLInputElement>(null);
  const [previewUpdated, setPreviewUpdated] = useState(false);
  const selection = choices.find((item) => item.key === choice);
  const plan =
    choice === "attach" ? plans.find((item) => item.id === planId) : null;
  const hasLinks = linkedIds.length > 0;
  const alreadyLinked = plan && linkedIds.includes(plan.id);
  const previewPlan = preview?.plan;

  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);

  useEffect(() => {
    const field = targetGroup.current?.querySelector<HTMLSelectElement>(
      'select[name="planId"]',
    );
    if (!field) return;
    const available = !planId || plans.some((item) => item.id === planId);
    field.value = available ? planId : "";
    if (!available) {
      setPlanId("");
      setPreview(null);
      setMissingTarget(true);
    }
  }, [plans, planId]);

  useEffect(() => {
    function showFilledPlan(event: Event) {
      const { target, input } =
        (
          event as CustomEvent<{
            target?: string;
            input?: { requestId?: string };
          }>
        ).detail ?? {};
      if (target !== "planning-request" || input?.requestId !== id) return;
      setPreview(null);
      if (!hasLinks) setChoice("create");
    }
    window.addEventListener("sovia-admin-action-output", showFilledPlan);
    return () =>
      window.removeEventListener("sovia-admin-action-output", showFilledPlan);
  }, [hasLinks, id]);

  function reviewBeforeSaving(event: FormEvent<HTMLDivElement>) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (choice) {
      const current = readDecision(form, choice, plans);
      if (
        confirmIntent.current &&
        preview &&
        JSON.stringify(current) === JSON.stringify(preview)
      )
        return;
      setPreviewUpdated(Boolean(preview));
      setPreview(choice === "attach" && !current.plan ? null : current);
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function confirm(form: HTMLFormElement, next: boolean) {
    if (!nextField.current) return;
    nextField.current.value = next ? "on" : "";
    confirmIntent.current = true;
    try {
      form.requestSubmit();
    } finally {
      confirmIntent.current = false;
    }
  }

  return (
    <div
      onSubmitCapture={reviewBeforeSaving}
      onChangeCapture={(event) => {
        const field = event.target;
        if (field instanceof HTMLSelectElement && field.name === "planId") {
          setPlanId(field.value);
          setMissingTarget(false);
          if (field.value) setChoice("attach");
        }
        setPreview(null);
      }}
      onInputCapture={() => setPreview(null)}
    >
      <AdminDirtyForm
        action={reviewRequestAction}
        id="request-review"
        className="min-w-0 space-y-5 rounded-lg border border-zinc-700 bg-zinc-900 p-4 sm:p-5"
      >
        <input type="hidden" name="requestId" value={id} />
        <input type="hidden" name="updatedAt" value={updatedAt} />
        <input type="hidden" name="decision" value={selection?.status ?? ""} />
        <div hidden={Boolean(preview)} className="space-y-5">
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-lg font-semibold">
              Decide on this recommendation
            </legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-2">
              {choices.map(({ key, label, icon: Icon }) => {
                const disabled =
                  (key === "create" && hasLinks) ||
                  (key === "attach" && !plans.length);
                return (
                  <label
                    key={key}
                    className="flex min-h-12 cursor-pointer items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 has-[:checked]:border-sky-400 has-[:checked]:bg-sky-950/40 has-[:checked]:text-sky-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400 has-[:disabled]:cursor-default has-[:disabled]:opacity-45"
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="choice"
                      value={key}
                      checked={key === choice}
                      onChange={() => setChoice(key)}
                      disabled={disabled}
                    />
                    <Icon aria-hidden="true" size={16} className="shrink-0" />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {hasLinks ? (
            <p className="text-xs text-zinc-400">
              This recommendation already has a linked plan.
            </p>
          ) : null}
          <fieldset
            className="min-w-0 space-y-3"
            hidden={choice !== "create"}
            disabled={choice !== "create"}
          >
            {planFields}
          </fieldset>
          <fieldset
            ref={targetGroup}
            className="min-w-0 space-y-3"
            hidden={choice !== "attach"}
            disabled={choice !== "attach"}
          >
            {targetField}
            {missingTarget ? (
              <output className="block text-xs text-amber-200">
                The selected plan is no longer available. Choose another plan.
              </output>
            ) : null}
            {plan ? (
              <p className="text-xs text-zinc-400">
                {plan.visible ? "Public" : "Private"} ·{" "}
                {plan.status.replaceAll("_", " ").toLowerCase()}{" "}
                {alreadyLinked ? "· Already linked" : ""}
              </p>
            ) : null}
          </fieldset>
          {choice === "needsInfo" ? (
            <p className="text-sm text-zinc-400">
              Record the missing information in the private review notes.
            </p>
          ) : null}
          {notesField}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              ref={editButton}
              type="submit"
              disabled={!selection || (choice === "attach" && !plan)}
            >
              Preview decision
            </Button>
            <Link
              className="text-sm text-zinc-400 underline underline-offset-4"
              href={skipHref}
            >
              Skip for now
            </Link>
          </div>
        </div>
        {preview && selection ? (
          <section className="min-w-0 space-y-4">
            <h2
              ref={previewHeading}
              tabIndex={-1}
              className="text-lg font-semibold"
            >
              Confirm your decision
            </h2>
            <div className="space-y-3 break-words rounded-md border border-zinc-700 bg-zinc-950 p-4 text-sm">
              <p className="font-semibold">{selection.label}</p>
              <p>
                {title} · {status.replaceAll("_", " ").toLowerCase()} →{" "}
                {selection.status.replaceAll("_", " ").toLowerCase()}
              </p>
              {choice === "create" ? (
                <>
                  <p className="text-zinc-400">
                    The recommendation will be linked to a new private plan in
                    Planning.
                  </p>
                  <dl className="grid gap-2">
                    {preview.draft.map(({ label, value }) => (
                      <div key={label}>
                        <dt className="text-xs text-zinc-400">{label}</dt>
                        <dd className="whitespace-pre-wrap">{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : null}
              {previewPlan ? (
                <div className="space-y-1">
                  <Link
                    className="text-sky-300 underline"
                    href={`/admin/todo/${encodeURIComponent(previewPlan.id)}`}
                  >
                    {previewPlan.title}
                  </Link>
                  <p>
                    {previewPlan.artist || "Unknown artist"} ·{" "}
                    {previewPlan.visible ? "Public" : "Private"} ·{" "}
                    {previewPlan.status === "PROPOSED"
                      ? "Proposed → Planning"
                      : previewPlan.status.replaceAll("_", " ").toLowerCase()}
                  </p>
                  <p className="text-zinc-400">
                    {linkedIds.includes(previewPlan.id)
                      ? "Keep this plan link."
                      : "Add the original recommendation to this plan."}{" "}
                    Its production notes and Work links are retained.
                  </p>
                </div>
              ) : null}
              {choice !== "create" && choice !== "attach" ? (
                <p className="text-zinc-400">
                  {hasLinks
                    ? "Existing plan links are retained. Public plans count accepted recommendations."
                    : "Only the recommendation and its review notes will be updated."}
                </p>
              ) : null}
              <div>
                <p className="text-xs text-zinc-400">Private review notes</p>
                <p className="whitespace-pre-wrap">
                  {preview.reviewNotes || "—"}
                </p>
              </div>
            </div>
            <input
              type="hidden"
              name="confirmedDecision"
              value={selection.status}
            />
            {previewUpdated ? (
              <output className="block text-sm text-amber-200">
                The preview was refreshed. Check the current details before
                confirming.
              </output>
            ) : null}
            <input type="hidden" name="next" ref={nextField} defaultValue="" />
            {previewPlan ? (
              <input
                type="hidden"
                name="planUpdatedAt"
                value={previewPlan.updatedAt}
              />
            ) : null}
            <ConfirmationButtons
              onConfirm={confirm}
              onBack={() => {
                setPreview(null);
                requestAnimationFrame(() => editButton.current?.focus());
              }}
            />
          </section>
        ) : null}
      </AdminDirtyForm>
    </div>
  );
}

function ConfirmationButtons({
  onConfirm,
  onBack,
}: {
  onConfirm: (form: HTMLFormElement, next: boolean) => void;
  onBack: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" disabled={pending} variant="ghost" onClick={onBack}>
        Back to editing
      </Button>
      <Button
        type="button"
        disabled={pending}
        onClick={(event) => {
          if (event.currentTarget.form)
            onConfirm(event.currentTarget.form, false);
        }}
      >
        {pending ? "Saving…" : "Confirm decision"}
      </Button>
      <Button
        type="button"
        disabled={pending}
        variant="outline"
        onClick={(event) => {
          if (event.currentTarget.form)
            onConfirm(event.currentTarget.form, true);
        }}
      >
        Confirm and review next
      </Button>
    </div>
  );
}
