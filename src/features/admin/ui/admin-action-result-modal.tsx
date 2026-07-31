"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminActionFormOutput } from "../actions/form-output";
import type { AdminActionDefinition, AdminActionRun } from "../actions/types";
import { AdminActionModal } from "./admin-action-modal";

const BUTTON_CLASS =
  "border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700";

export function AdminActionResultModal({
  action,
  busy,
  consumeOutput,
  fields,
  notice,
  onBack,
  onFill,
  onSave,
  open,
  run,
}: {
  action: AdminActionDefinition;
  busy: boolean;
  consumeOutput: boolean;
  fields: readonly AdminActionFormOutput[];
  notice: string | null;
  onBack: () => void;
  onFill: (fields?: readonly AdminActionFormOutput[]) => void;
  onSave: () => void;
  open: boolean;
  run: AdminActionRun;
}) {
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [currentValues] = useState(() => getCurrentFormValues(fields));
  const appendFields = fields.filter((field) => field.operation === "append");
  const hasFormChanges = fields.some(
    (field) => currentValues[field.name] !== field.value,
  );
  const canFillAll =
    consumeOutput &&
    Boolean(action.output.applyToForm) &&
    fields.length > 0 &&
    appendFields.length === 0;

  function addField(field: AdminActionFormOutput) {
    onFill([field]);
    setAppliedFields((current) => {
      const next = new Set(current);
      next.add(getFieldKey(field));
      return next;
    });
  }

  return (
    <AdminActionModal
      closeDisabled={busy}
      description="Review the generated result before applying or saving it."
      footer={
        <>
          <Button
            className={BUTTON_CLASS}
            disabled={busy}
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to action
          </Button>
          {action.output.save && !consumeOutput ? (
            <Button
              className={BUTTON_CLASS}
              disabled={busy || run.status === "saved"}
              onClick={onSave}
              type="button"
            >
              {run.status === "saved" ? "Saved" : "Save to database"}
            </Button>
          ) : null}
          {canFillAll ? (
            <Button
              className={BUTTON_CLASS}
              disabled={busy || !hasFormChanges}
              onClick={() => onFill()}
              type="button"
            >
              {hasFormChanges ? "Fill current form" : "No changes"}
            </Button>
          ) : null}
        </>
      }
      hideTrigger
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onBack();
      }}
      open={open}
      size="wide"
      title={`${action.title} result`}
      type={action.type}
    >
      {run.error ? <p className="text-sm text-red-300">{run.error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      <ActionResultView
        action={action}
        appliedFields={appliedFields}
        currentValues={currentValues}
        fields={fields}
        onAdd={addField}
      />
      <details className="rounded-md border border-zinc-800 bg-zinc-900/40">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-300">
          Raw response
        </summary>
        <pre className="max-h-64 overflow-auto overscroll-contain border-t border-zinc-800 p-3 text-xs leading-5 whitespace-pre-wrap text-zinc-400">
          {JSON.stringify(run.output, null, 2)}
        </pre>
      </details>
    </AdminActionModal>
  );
}

function ActionResultView({
  action,
  appliedFields,
  currentValues,
  fields,
  onAdd,
}: {
  action: AdminActionDefinition;
  appliedFields: ReadonlySet<string>;
  currentValues: Readonly<Record<string, string | undefined>>;
  fields: readonly AdminActionFormOutput[];
  onAdd: (field: AdminActionFormOutput) => void;
}) {
  if (!fields.length) {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-sm text-zinc-300">
          This action returned a result without recognized display fields.
        </p>
      </div>
    );
  }

  if (action.output.applyToForm === "related") {
    return (
      <div className="grid gap-3">
        {fields.map((field) => {
          const key = getFieldKey(field);
          const existingRelated = getRelatedIds(currentValues[field.name]);
          const alreadyPresent = existingRelated.has(field.value);
          const applied = alreadyPresent || appliedFields.has(key);
          return (
            <article
              className="grid gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-4"
              key={key}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {field.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    CID {field.value}
                  </p>
                </div>
                <Button
                  className={BUTTON_CLASS}
                  disabled={applied}
                  onClick={() => onAdd(field)}
                  type="button"
                >
                  {applied ? <Check className="h-4 w-4" /> : null}
                  {alreadyPresent ? "Already added" : applied ? "Added" : "Add"}
                </Button>
              </div>
              {field.description ? (
                <p className="text-sm leading-6 text-zinc-300">
                  {field.description}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    );
  }

  if (
    action.output.applyToForm === "youtubeBatch" ||
    action.output.applyToForm === "subtitles"
  ) {
    return <LocalizedResult currentValues={currentValues} fields={fields} />;
  }

  return (
    <div className="grid gap-3">
      {fields.map((field) => (
        <ResultFieldCard
          currentValue={currentValues[field.name]}
          field={field}
          key={getFieldKey(field)}
        />
      ))}
    </div>
  );
}

function LocalizedResult({
  currentValues,
  fields,
}: {
  currentValues: Readonly<Record<string, string | undefined>>;
  fields: readonly AdminActionFormOutput[];
}) {
  const grouped = new Map<string, AdminActionFormOutput[]>();
  for (const field of fields) {
    const locale = getFieldLocale(field);
    grouped.set(locale, [...(grouped.get(locale) ?? []), field]);
  }

  return (
    <div className="grid gap-3">
      {Array.from(grouped.entries()).map(([locale, localeFields]) => (
        <section
          className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-4"
          key={locale}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-100">{locale}</h3>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
              {localeFields.length} field{localeFields.length === 1 ? "" : "s"}
            </span>
          </div>
          {localeFields.map((field) => (
            <ResultFieldCard
              currentValue={currentValues[field.name]}
              field={field}
              key={getFieldKey(field)}
              nested
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function ResultFieldCard({
  currentValue,
  field,
  nested = false,
}: {
  currentValue?: string;
  field: AdminActionFormOutput;
  nested?: boolean;
}) {
  const isSrt = field.name.startsWith("subtitleTracks.");
  const isTags = field.name === "pixivTags";
  const lines = field.value.split(/\r?\n/).length;
  const status = getFieldStatus(currentValue, field.value);

  return (
    <article
      className={`grid gap-2 rounded-md border border-zinc-800 ${
        nested ? "bg-zinc-950/70 p-3" : "bg-zinc-900/50 p-4"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-100">{field.label}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className={getStatusClass(status)}>{status}</span>
          <span className="text-xs text-zinc-500">
            {isSrt
              ? `${lines} lines · ${field.value.length} characters`
              : `${field.value.length} characters`}
          </span>
        </div>
      </div>
      {currentValue !== undefined && currentValue !== field.value ? (
        <details className="rounded-md border border-zinc-800 bg-zinc-950/70">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-400">
            Current value
          </summary>
          <div
            className={`max-h-40 overflow-auto overscroll-contain border-t border-zinc-800 p-3 whitespace-pre-wrap text-zinc-500 ${
              isSrt ? "font-mono text-xs" : "text-sm leading-6"
            }`}
          >
            {currentValue || "Empty"}
          </div>
        </details>
      ) : null}
      <p className="text-xs font-medium text-zinc-500">Generated value</p>
      {isTags ? (
        <div className="flex flex-wrap gap-2">
          {field.value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => (
              <span
                className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
                key={tag}
              >
                {tag}
              </span>
            ))}
        </div>
      ) : (
        <div
          className={`overflow-auto overscroll-contain rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 whitespace-pre-wrap text-zinc-300 ${
            isSrt ? "max-h-64 font-mono text-xs" : "max-h-56"
          }`}
        >
          {field.value}
        </div>
      )}
    </article>
  );
}

function getFieldLocale(field: AdminActionFormOutput) {
  const youtubeMatch = /^youtubeLocalization\.([^.]+)\./.exec(field.name);
  if (youtubeMatch?.[1]) return youtubeMatch[1];
  const subtitleMatch = /^subtitleTracks\.([^.]+)$/.exec(field.name);
  return subtitleMatch?.[1] ?? "Result";
}

function getFieldKey(field: AdminActionFormOutput) {
  return `${field.name}\u0000${field.value}`;
}

function getCurrentFormValues(fields: readonly AdminActionFormOutput[]) {
  const values: Record<string, string | undefined> = {};
  for (const field of fields) {
    const form = Array.from(document.forms).find((candidate) =>
      Boolean(candidate.elements.namedItem(field.name)),
    );
    const control = form?.elements.namedItem(field.name);
    values[field.name] =
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
        ? control.value
        : undefined;
  }
  return values;
}

function getRelatedIds(value?: string) {
  return new Set(
    (value ?? "")
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function getFieldStatus(currentValue: string | undefined, nextValue: string) {
  if (currentValue === undefined) return "Generated";
  if (currentValue === nextValue) return "Unchanged";
  if (!currentValue.trim()) return "New";
  return "Changed";
}

function getStatusClass(status: ReturnType<typeof getFieldStatus>) {
  const tone =
    status === "Unchanged"
      ? "border-zinc-700 text-zinc-400"
      : status === "Changed"
        ? "border-amber-700/70 bg-amber-950/30 text-amber-200"
        : "border-emerald-700/70 bg-emerald-950/30 text-emerald-200";
  return `rounded-full border px-2 py-0.5 text-xs ${tone}`;
}
