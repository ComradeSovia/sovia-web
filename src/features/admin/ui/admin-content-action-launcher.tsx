"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminActionFormContext } from "../actions/form-context";
import {
  type AdminActionFormOutput,
  getAdminActionFormOutput,
} from "../actions/form-output";
import type {
  AdminActionCloseEvent,
  AdminActionDefinition,
  AdminActionInput,
  AdminActionInputValues,
  AdminActionRun,
} from "../actions/types";
import { getAdminActionView } from "../actions/views";
import { AdminActionModal } from "./admin-action-modal";
import { AdminActionResultModal } from "./admin-action-result-modal";

const BUTTON_CLASS =
  "border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700";

const DEFAULT_CLOSE_EVENTS: readonly AdminActionCloseEvent[] = [
  "applied",
  "completed",
];

function shouldCloseAction(
  action: AdminActionDefinition,
  event: AdminActionCloseEvent,
) {
  return (action.closeOn ?? DEFAULT_CLOSE_EVENTS).includes(event);
}

function createRun(
  action: AdminActionDefinition,
  initialValues: AdminActionInputValues,
): AdminActionRun {
  return {
    actionId: action.id,
    input: initialValues,
    status: "idle",
  };
}

export function AdminActionLauncher({
  action,
  consumeOutput = false,
  initialValues = {},
  onActionComplete,
  onDismiss,
  onInputValuesChange,
  onOpenChange,
  open,
}: {
  action: AdminActionDefinition;
  consumeOutput?: boolean;
  initialValues?: AdminActionInputValues;
  onActionComplete?: (message: string) => void;
  onDismiss?: () => void;
  onInputValuesChange?: (values: AdminActionInputValues) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const router = useRouter();
  const [run, setRun] = useState(() => createRun(action, initialValues));
  const [resultOpen, setResultOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = run.status === "running" || run.status === "saving";
  const CustomActionView = getAdminActionView(action);

  function updateValue(key: string, value: string | boolean) {
    onInputValuesChange?.({ ...run.input, [key]: value });
    setRun((current) => {
      const input = { ...current.input, [key]: value };
      return {
        ...current,
        error: undefined,
        input,
        output: undefined,
        status: "idle",
      };
    });
    setResultOpen(false);
    setNotice(null);
  }

  function applyEffects(
    phase: "onCompleted" | "onFailed" | "onSaved",
    output?: unknown,
  ) {
    for (const effect of action.after?.[phase] ?? []) {
      if (effect.type === "refresh-context") router.refresh();
      if (effect.type === "navigate") router.push(effect.href);
      if (effect.type === "navigate-output") {
        const value =
          output && typeof output === "object" && !Array.isArray(output)
            ? (output as Record<string, unknown>)[effect.valueKey]
            : undefined;
        if (typeof value === "string" && value) {
          router.push(
            effect.path.replace(
              `:${effect.valueKey}`,
              encodeURIComponent(value),
            ),
          );
        }
      }
      if (effect.type === "toast") setNotice(effect.message);
      if (effect.type === "consume-output") {
        window.dispatchEvent(
          new CustomEvent("sovia-admin-action-output", {
            detail: {
              actionId: action.id,
              output,
              target: effect.target,
            },
          }),
        );
      }
    }
  }

  async function execute() {
    setNotice(null);
    setResultOpen(false);
    setRun((current) => ({
      ...current,
      error: undefined,
      output: undefined,
      status: "validating",
    }));

    const body: Record<string, unknown> = {};
    for (const input of action.inputs) {
      const value = run.input[input.key];
      if (
        input.required &&
        (value === undefined || value === "" || value === false)
      ) {
        setRun((current) => ({
          ...current,
          error: `${input.label} is required.`,
          status: "failed",
        }));
        applyEffects("onFailed");
        return;
      }
      if (
        (input.type === "json" ||
          input.type === "subtitleLocales" ||
          input.type === "youtubeLocales") &&
        typeof value === "string" &&
        value.trim()
      ) {
        try {
          body[input.key] = JSON.parse(value);
        } catch {
          setRun((current) => ({
            ...current,
            error: `${input.label} must be valid JSON.`,
            status: "failed",
          }));
          applyEffects("onFailed");
          return;
        }
      } else if (
        (input.key !== "contentId" || action.scope !== "content") &&
        value !== undefined
      ) {
        body[input.key] = value;
      }
    }
    Object.assign(
      body,
      getAdminActionFormContext(action.execution.formContext, body),
    );

    if (action.execution.type === "form") {
      setRun((current) => ({ ...current, status: "running" }));
      const form = document.createElement("form");
      form.action = action.execution.endpoint;
      form.method = "post";
      document.body.append(form);
      form.submit();
      return;
    }

    const contentId = run.input.contentId;
    if (
      action.scope === "content" &&
      (typeof contentId !== "string" || !contentId.trim())
    ) {
      setRun((current) => ({
        ...current,
        error: "CID is required.",
        status: "failed",
      }));
      applyEffects("onFailed");
      return;
    }

    setRun((current) => ({ ...current, status: "running" }));
    try {
      const endpoint = resolveActionEndpoint(
        action.execution.endpoint,
        run.input,
      );
      const result = action.execution.batch
        ? await executeBatchedHttpAction({
            action,
            body,
            endpoint,
            onProgress: setNotice,
          })
        : {
            payload: await requestAction(endpoint, body, action.title),
            warning: null,
          };
      const payload = result.payload;
      setNotice(result.warning);
      setRun((current) => ({
        ...current,
        output: payload,
        status: "succeeded",
      }));
      applyEffects("onCompleted", payload);
      if (action.output.mode === "preview") {
        setResultOpen(true);
      } else {
        onActionComplete?.(`${action.title} completed.`);
        if (shouldCloseAction(action, "completed")) onOpenChange(false);
      }
    } catch (actionError) {
      setRun((current) => ({
        ...current,
        error:
          actionError instanceof Error
            ? actionError.message
            : `${action.title} failed.`,
        status: "failed",
      }));
      applyEffects("onFailed");
    }
  }

  async function saveOutput() {
    if (!action.output.save || run.output === undefined) return;
    const contentId = run.input.contentId;
    if (typeof contentId !== "string" || !contentId.trim()) return;

    setRun((current) => ({ ...current, error: undefined, status: "saving" }));
    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId.trim())}/apply-action-output`,
        {
          body: JSON.stringify({
            action: action.output.save.target,
            output: run.output,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || "Saving action output failed.");
      setRun((current) => ({ ...current, status: "saved" }));
      applyEffects("onSaved", run.output);
      if (shouldCloseAction(action, "saved")) onOpenChange(false);
    } catch (saveError) {
      setRun((current) => ({
        ...current,
        error:
          saveError instanceof Error
            ? saveError.message
            : "Saving action output failed.",
        status: "failed",
      }));
      applyEffects("onFailed");
    }
  }

  function renderInput(input: AdminActionInput) {
    return (
      <ActionInput
        input={input}
        key={input.key}
        onChange={updateValue}
        value={run.input[input.key]}
        values={run.input}
      />
    );
  }

  const formOutput =
    action.output.applyToForm && run.output !== undefined
      ? getAdminActionFormOutput({
          input: run.input,
          output: run.output,
          target: action.output.applyToForm,
        })
      : [];

  function fillCurrentForm(
    fields: readonly AdminActionFormOutput[] = formOutput,
  ) {
    if (!action.output.applyToForm || run.output === undefined) return;
    if (!fields.length) {
      setRun((current) => ({
        ...current,
        error:
          "This action did not return fields that can fill the current form.",
        status: "failed",
      }));
      return;
    }

    window.dispatchEvent(
      new CustomEvent("sovia-admin-action-output", {
        detail: {
          input: run.input,
          output: run.output,
          formOutput: fields,
          target: action.output.applyToForm,
        },
      }),
    );
    if (shouldCloseAction(action, "applied")) onOpenChange(false);
  }

  return (
    <>
      <AdminActionModal
        closeDisabled={busy}
        description={action.description}
        footer={
          CustomActionView ? undefined : (
            <StandardActionFooter
              action={action}
              busy={busy}
              execute={execute}
              onViewResult={() => setResultOpen(true)}
              run={run}
            />
          )
        }
        hideTrigger
        onDismiss={onDismiss}
        onOpenChange={onOpenChange}
        open={open && !resultOpen}
        title={action.title}
        type={action.type}
      >
        {CustomActionView ? (
          <CustomActionView
            action={action}
            busy={busy}
            consumeOutput={consumeOutput}
            execute={execute}
            fillCurrentForm={fillCurrentForm}
            formOutput={formOutput}
            renderInput={renderInput}
            run={run}
            saveOutput={saveOutput}
            setInputValue={updateValue}
            togglePreview={() => setResultOpen((current) => !current)}
          />
        ) : (
          <StandardActionContent
            action={action}
            notice={notice}
            renderInput={renderInput}
            run={run}
          />
        )}
      </AdminActionModal>
      {run.output !== undefined ? (
        <AdminActionResultModal
          action={action}
          busy={busy}
          consumeOutput={consumeOutput}
          fields={formOutput}
          notice={notice}
          onBack={() => setResultOpen(false)}
          onFill={fillCurrentForm}
          onSave={saveOutput}
          open={open && resultOpen}
          run={run}
        />
      ) : null}
    </>
  );
}

function StandardActionContent({
  action,
  notice,
  renderInput,
  run,
}: {
  action: AdminActionDefinition;
  notice: string | null;
  renderInput: (input: AdminActionInput) => ReactNode;
  run: AdminActionRun;
}) {
  return (
    <>
      {action.presentation.type === "confirm" ? (
        <p className="rounded-md border border-amber-800/70 bg-amber-950/30 p-3 text-sm leading-6 text-amber-200">
          {action.presentation.confirmation}
        </p>
      ) : null}
      {action.inputs.map(renderInput)}
      {run.error ? <p className="text-sm text-red-300">{run.error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {run.status === "succeeded" && action.output.mode === "none" ? (
        <p className="text-sm text-emerald-300">Action completed.</p>
      ) : null}
    </>
  );
}

function StandardActionFooter({
  action,
  busy,
  execute,
  onViewResult,
  run,
}: {
  action: AdminActionDefinition;
  busy: boolean;
  execute: () => void;
  onViewResult: () => void;
  run: AdminActionRun;
}) {
  return (
    <>
      {run.output !== undefined && action.output.mode === "preview" ? (
        <Button className={BUTTON_CLASS} onClick={onViewResult} type="button">
          Review result
        </Button>
      ) : null}
      <Button
        className={BUTTON_CLASS}
        disabled={busy || run.status === "saved"}
        onClick={execute}
        type="button"
      >
        {busy
          ? run.status === "saving"
            ? "Saving..."
            : "Running..."
          : run.status === "failed"
            ? "Retry action"
            : (action.executeLabel ?? "Run action")}
      </Button>
    </>
  );
}

async function requestAction(
  endpoint: string,
  body: Record<string, unknown>,
  actionTitle: string,
) {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as Record<string, unknown> & {
    message?: string;
  };
  if (!response.ok) {
    if (response.status === 504) {
      throw new Error(
        "This batch timed out. The remaining languages can be retried.",
      );
    }
    throw new Error(payload.message || `${actionTitle} failed.`);
  }
  return payload;
}

async function executeBatchedHttpAction({
  action,
  body,
  endpoint,
  onProgress,
}: {
  action: AdminActionDefinition;
  body: Record<string, unknown>;
  endpoint: string;
  onProgress: (message: string | null) => void;
}) {
  const batch = action.execution.batch;
  if (!batch) {
    return {
      payload: await requestAction(endpoint, body, action.title),
      warning: null,
    };
  }

  const batchInputKey = batch.inputKey;
  const batchOutputKey = batch.outputKey;
  const rawTargets = body[batchInputKey];
  const targets: string[] = Array.isArray(rawTargets)
    ? rawTargets.filter(
        (locale: unknown): locale is string => typeof locale === "string",
      )
    : [];
  if (!targets.length) {
    throw new Error("Select at least one target language.");
  }

  const sourceLocale =
    typeof body.sourceLocale === "string" ? body.sourceLocale : "";
  const isSubtitleBatch = batch.strategy === "subtitle-localizations";
  const localizedContent = isSubtitleBatch
    ? isRecord(body.subtitleTracks)
      ? body.subtitleTracks
      : {}
    : isRecord(body.youtubeLocalization)
      ? body.youtubeLocalization
      : {};
  const sourceValue = localizedContent[sourceLocale];
  const sourceLength = isSubtitleBatch
    ? typeof sourceValue === "string"
      ? sourceValue.length
      : 0
    : isRecord(sourceValue) && typeof sourceValue.description === "string"
      ? sourceValue.description.length
      : 0;
  const batchSize = isSubtitleBatch
    ? getSubtitleBatchSize(sourceLength)
    : getYoutubeBatchSize(sourceLength);
  const batches = chunkValues(targets, batchSize);
  const outputByLocale = new Map<string, Record<string, unknown>>();
  const failedLocales = new Set<string>();
  let completed = 0;

  async function runBatch(targetLocales: string[]) {
    try {
      const batchBody: Record<string, unknown> = {
        ...body,
        [batchInputKey]: targetLocales,
      };
      if (isSubtitleBatch && sourceLocale && typeof sourceValue === "string") {
        batchBody.subtitleTracks = {
          [sourceLocale]: sourceValue,
          ...Object.fromEntries(
            targetLocales.flatMap((locale) =>
              typeof localizedContent[locale] === "string"
                ? [[locale, localizedContent[locale]]]
                : [],
            ),
          ),
        };
      } else if (!isSubtitleBatch && sourceLocale && isRecord(sourceValue)) {
        batchBody.youtubeLocalization = {
          [sourceLocale]: sourceValue,
          ...Object.fromEntries(
            targetLocales.flatMap((locale) =>
              isRecord(localizedContent[locale])
                ? [[locale, localizedContent[locale]]]
                : [],
            ),
          ),
        };
      }
      const payload = await requestAction(endpoint, batchBody, action.title);
      const rawOutput = payload[batchOutputKey];
      const output: unknown[] = Array.isArray(rawOutput) ? rawOutput : [];
      for (const locale of targetLocales) {
        const item = output.find(
          (candidate) =>
            isRecord(candidate) &&
            candidate.locale === locale &&
            (isSubtitleBatch
              ? typeof candidate.srt === "string" && candidate.srt.trim()
              : typeof candidate.title === "string" &&
                candidate.title.trim() &&
                typeof candidate.description === "string" &&
                candidate.description.trim()),
        );
        if (isRecord(item)) {
          outputByLocale.set(locale, item);
        } else {
          failedLocales.add(locale);
        }
      }
    } catch {
      for (const locale of targetLocales) failedLocales.add(locale);
    } finally {
      completed += targetLocales.length;
      onProgress(
        `Processed ${completed} of ${targets.length} target languages...`,
      );
    }
  }

  await runBatch(batches[0]);
  let cursor = 1;
  async function worker() {
    while (cursor < batches.length) {
      const index = cursor;
      cursor += 1;
      await runBatch(batches[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(2, Math.max(0, batches.length - 1)) }, () =>
      worker(),
    ),
  );

  const localizations = targets.flatMap((locale) => {
    const output = outputByLocale.get(locale);
    return output ? [output] : [];
  });
  if (!localizations.length) {
    throw new Error(
      `${isSubtitleBatch ? "Subtitle" : "YouTube"} translation failed for: ${Array.from(failedLocales).join(", ") || targets.join(", ")}.`,
    );
  }

  return {
    payload: { [batchOutputKey]: localizations },
    warning: failedLocales.size
      ? `Translated ${localizations.length} of ${targets.length}. Failed: ${Array.from(failedLocales).join(", ")}.`
      : `Translated all ${localizations.length} target languages.`,
  };
}

function getYoutubeBatchSize(sourceDescriptionLength: number) {
  // Global Actions do not load saved localization text until the server handles
  // the request, so use one locale per request when its size is unknown.
  if (!sourceDescriptionLength || sourceDescriptionLength > 2_500) return 1;
  if (sourceDescriptionLength > 1_200) return 2;
  return 3;
}

function getSubtitleBatchSize(sourceSrtLength: number) {
  // Global Actions do not load the full saved SRT into the modal. Use the
  // safest batch size when only the server can resolve the source track.
  if (!sourceSrtLength) return 1;
  if (sourceSrtLength > 4_500) return 1;
  if (sourceSrtLength > 2_500) return 2;
  return 3;
}

function chunkValues<T>(values: readonly T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ActionInput({
  input,
  onChange,
  value,
  values,
}: {
  input: AdminActionInput;
  onChange: (key: string, value: string | boolean) => void;
  value: string | boolean | undefined;
  values: AdminActionInputValues;
}) {
  if (input.type === "hidden") return null;

  const id = `admin-action-input-${input.key}`;
  const description = input.description ? (
    <p className="-mt-1 text-xs leading-5 text-zinc-500">{input.description}</p>
  ) : null;

  if (input.type === "checkbox") {
    return (
      <label
        className="flex items-start gap-3 rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200"
        htmlFor={id}
      >
        <Input
          checked={value === true}
          className="mt-0.5 size-4"
          id={id}
          onChange={(event) => onChange(input.key, event.target.checked)}
          type="checkbox"
        />
        <span className="grid gap-1">
          <span>{input.label}</span>
          {description}
        </span>
      </label>
    );
  }

  if (input.type === "select") {
    return (
      <div className="grid gap-2">
        <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
          {input.label}
        </Label>
        <Select
          onValueChange={(nextValue) => onChange(input.key, nextValue)}
          value={typeof value === "string" ? value : undefined}
        >
          <SelectTrigger className="w-full border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none focus-visible:ring-zinc-500">
            <SelectValue
              placeholder={`Select ${input.label.toLowerCase()}...`}
            />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
            {input.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description}
      </div>
    );
  }

  if (
    input.type === "content" ||
    input.type === "prompt" ||
    input.type === "youtubeLocale"
  ) {
    return (
      <div className="grid gap-2">
        <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
          {input.label}
        </Label>
        <ActionOptionSelect
          allowDefault={input.type === "prompt" || input.allowDefault === true}
          defaultFromFormField={input.defaultFromFormField}
          defaultOptionLabel={
            input.defaultOptionLabel ?? "Use enabled default prompt"
          }
          onChange={(nextValue) => onChange(input.key, nextValue)}
          placeholder={
            input.type === "youtubeLocale" ? "Select locale..." : undefined
          }
          source={
            input.type === "content"
              ? { type: "content" }
              : input.type === "prompt"
                ? { task: input.promptTask ?? "", type: "prompt" }
                : { type: "youtubeLocale" }
          }
          value={typeof value === "string" ? value : ""}
        />
        {description}
      </div>
    );
  }

  if (input.type === "subtitleLocale") {
    return (
      <div className="grid gap-2">
        <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
          {input.label}
        </Label>
        <ActionSubtitleLocaleSelect
          allowDefault={input.allowDefault === true}
          defaultFromSubtitleForm={input.defaultFromSubtitleForm === true}
          defaultOptionLabel={
            input.defaultOptionLabel ?? "Use saved primary subtitle language"
          }
          onChange={(nextValue) => onChange(input.key, nextValue)}
          value={typeof value === "string" ? value : ""}
        />
        {description}
      </div>
    );
  }

  if (input.type === "subtitleLocales") {
    return (
      <div className="grid gap-2">
        <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
          {input.label}
        </Label>
        <ActionSubtitleLocaleMultiSelect
          onChange={(nextValue) => onChange(input.key, nextValue)}
          value={typeof value === "string" ? value : ""}
        />
        {description}
      </div>
    );
  }

  if (input.type === "youtubeLocales") {
    return (
      <div className="grid gap-2">
        <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
          {input.label}
        </Label>
        <ActionLocaleMultiSelect
          excludedValue={
            input.excludeInputKey
              ? getStringInputValue(values[input.excludeInputKey])
              : undefined
          }
          onChange={(nextValue) => onChange(input.key, nextValue)}
          selectAllByDefault={input.selectAllByDefault === true}
          value={typeof value === "string" ? value : ""}
        />
        {description}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label
        className="text-xs font-medium normal-case tracking-normal text-zinc-300"
        htmlFor={id}
      >
        {input.label}
      </Label>
      {input.type === "textarea" || input.type === "json" ? (
        <Textarea
          className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
          id={id}
          onChange={(event) => onChange(input.key, event.target.value)}
          rows={input.type === "json" ? 6 : 4}
          value={typeof value === "string" ? value : ""}
        />
      ) : (
        <Input
          className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
          id={id}
          onChange={(event) => onChange(input.key, event.target.value)}
          value={typeof value === "string" ? value : ""}
        />
      )}
      {description}
    </div>
  );
}

type ActionOption = { isDefault?: boolean; label: string; value: string };

function ActionOptionSelect({
  allowDefault,
  defaultFromFormField,
  defaultOptionLabel,
  onChange,
  placeholder,
  source,
  value,
}: {
  allowDefault: boolean;
  defaultFromFormField?: string;
  defaultOptionLabel: string;
  onChange: (value: string) => void;
  placeholder?: string;
  source: {
    task?: string;
    type: "content" | "prompt" | "youtubeLocale";
  };
  value: string;
}) {
  const [options, setOptions] = useState<ActionOption[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initializedFromFormRef = useRef(false);
  const initializedDefaultPromptRef = useRef(false);

  useEffect(() => {
    if (
      initializedFromFormRef.current ||
      value ||
      !defaultFromFormField ||
      !optionsLoaded
    ) {
      return;
    }

    const form = Array.from(document.forms).find((candidate) =>
      Boolean(candidate.elements.namedItem(defaultFromFormField)),
    );
    const formValue = form
      ? getFormControlStringValue(form, defaultFromFormField)
      : "";
    if (!formValue || !options.some((option) => option.value === formValue)) {
      return;
    }

    initializedFromFormRef.current = true;
    onChange(formValue);
  }, [defaultFromFormField, onChange, options, optionsLoaded, value]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ type: source.type });
    if (source.task) params.set("task", source.task);

    async function loadOptions() {
      setLoading(true);
      setOptionsLoaded(false);
      setError(null);
      try {
        const response = await fetch(`/admin/api/actions/options?${params}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          message?: string;
          options?: ActionOption[];
        };
        if (!response.ok) {
          throw new Error(payload.message || "Options could not be loaded.");
        }
        setOptions(payload.options ?? []);
        setOptionsLoaded(true);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Options could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOptions();
    return () => controller.abort();
  }, [source.task, source.type]);

  useEffect(() => {
    if (
      !optionsLoaded ||
      !value ||
      options.some((option) => option.value === value)
    ) {
      return;
    }
    onChange("");
  }, [onChange, options, optionsLoaded, value]);

  useEffect(() => {
    if (
      initializedDefaultPromptRef.current ||
      source.type !== "prompt" ||
      value ||
      !optionsLoaded
    ) {
      return;
    }
    const defaultPrompt = options.find((option) => option.isDefault);
    if (!defaultPrompt) return;

    initializedDefaultPromptRef.current = true;
    onChange(defaultPrompt.value);
  }, [onChange, options, optionsLoaded, source.type, value]);

  const defaultOptionValue = "__use-action-default__";
  const selectedOptionExists = options.some((option) => option.value === value);
  const enabledDefaultOption =
    source.type === "prompt"
      ? options.find((option) => option.isDefault)
      : undefined;
  const showDefaultOption = allowDefault && source.type !== "prompt";
  const selectedValue =
    optionsLoaded && selectedOptionExists
      ? value
      : optionsLoaded && enabledDefaultOption
        ? enabledDefaultOption.value
        : optionsLoaded && allowDefault
          ? defaultOptionValue
          : undefined;

  return (
    <div className="grid gap-1">
      <Select
        disabled={loading}
        onValueChange={(nextValue) =>
          onChange(nextValue === defaultOptionValue ? "" : nextValue)
        }
        value={selectedValue}
      >
        <SelectTrigger className="w-full border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none focus-visible:ring-zinc-500">
          <SelectValue
            placeholder={
              loading
                ? "Loading options..."
                : source.type === "content"
                  ? "Select content..."
                  : source.type === "youtubeLocale"
                    ? (placeholder ?? "Select locale...")
                    : defaultOptionLabel
            }
          />
        </SelectTrigger>
        <SelectContent
          align="start"
          className="max-h-80 overscroll-contain border-zinc-700 bg-zinc-950 text-zinc-100"
          position="popper"
        >
          {showDefaultOption ? (
            <SelectGroup>
              <SelectLabel>Default</SelectLabel>
              <SelectItem value={defaultOptionValue}>
                {defaultOptionLabel}
              </SelectItem>
            </SelectGroup>
          ) : null}
          <SelectGroup>
            <SelectLabel>
              {source.type === "content"
                ? "Content"
                : source.type === "youtubeLocale"
                  ? "Enabled YouTube locales"
                  : "Enabled prompts"}
            </SelectLabel>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {!loading && !error && !options.length ? (
        <p className="text-xs text-zinc-500">No options are available.</p>
      ) : null}
    </div>
  );
}

function ActionLocaleMultiSelect({
  excludedValue,
  onChange,
  selectAllByDefault = false,
  value,
}: {
  excludedValue?: string;
  onChange: (value: string) => void;
  selectAllByDefault?: boolean;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ActionOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selected = getSelectedLocales(value);

  useEffect(() => {
    if (!open && !selectAllByDefault) return;

    const controller = new AbortController();
    async function loadOptions() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "/admin/api/actions/options?type=youtubeLocale",
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          message?: string;
          options?: ActionOption[];
        };
        if (!response.ok) {
          throw new Error(payload.message || "Locales could not be loaded.");
        }
        setOptions(payload.options ?? []);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Locales could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOptions();
    return () => controller.abort();
  }, [open, selectAllByDefault]);

  useEffect(() => {
    if (!selectAllByDefault || !options.length) return;

    const nextDefault = options
      .map((option) => option.value)
      .filter((locale) => locale !== excludedValue);
    const nextSelected = selected.filter((locale) => locale !== excludedValue);

    if (!value) {
      onChange(JSON.stringify(nextDefault));
      return;
    }
    if (nextSelected.length !== selected.length) {
      onChange(JSON.stringify(nextSelected));
    }
  }, [excludedValue, onChange, options, selectAllByDefault, selected, value]);

  function toggleLocale(locale: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selected, locale]))
      : selected.filter((item) => item !== locale);
    onChange(JSON.stringify(next));
  }

  return (
    <details
      className="rounded-md border border-zinc-700 bg-zinc-950 text-zinc-100"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-10 cursor-pointer px-3 py-2 text-sm marker:hidden">
        {selected.length
          ? `${selected.length} locale${selected.length === 1 ? "" : "s"} selected`
          : "Select locales..."}
      </summary>
      <div className="grid max-h-64 gap-2 overflow-y-auto overscroll-contain border-t border-zinc-800 p-3">
        {loading ? (
          <p className="text-xs text-zinc-500">Loading locales...</p>
        ) : null}
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        {!loading && !error && !options.length ? (
          <p className="text-xs text-zinc-500">
            No enabled locales are available.
          </p>
        ) : null}
        {options.map((option) => (
          <div
            className="flex items-center gap-2 text-sm text-zinc-300"
            key={option.value}
          >
            <Input
              checked={selected.includes(option.value)}
              className="size-4 border-zinc-600"
              id={`admin-action-locale-${option.value}`}
              onChange={(event) =>
                toggleLocale(option.value, event.target.checked)
              }
              type="checkbox"
            />
            <Label
              className="cursor-pointer text-sm font-normal text-zinc-300"
              htmlFor={`admin-action-locale-${option.value}`}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </details>
  );
}

function ActionSubtitleLocaleSelect({
  allowDefault,
  defaultFromSubtitleForm,
  defaultOptionLabel,
  onChange,
  value,
}: {
  allowDefault: boolean;
  defaultFromSubtitleForm: boolean;
  defaultOptionLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || value || !defaultFromSubtitleForm) return;

    const form = Array.from(document.forms).find((candidate) =>
      Boolean(candidate.elements.namedItem("subtitlePrimaryLocale")),
    );
    const primaryLocale = form
      ? getFormControlStringValue(form, "subtitlePrimaryLocale")
      : "";
    if (!primaryLocale) return;

    initializedRef.current = true;
    onChange(primaryLocale);
  }, [defaultFromSubtitleForm, onChange, value]);

  return (
    <ActionOptionSelect
      allowDefault={allowDefault}
      defaultOptionLabel={defaultOptionLabel}
      onChange={onChange}
      placeholder="Select source locale..."
      source={{ type: "youtubeLocale" }}
      value={value}
    />
  );
}

function ActionSubtitleLocaleMultiSelect({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [hasSubtitleForm, setHasSubtitleForm] = useState(false);
  const [open, setOpen] = useState(false);
  const [readyLocales, setReadyLocales] = useState<string[]>([]);
  const initializedSelectionRef = useRef<string | null>(null);
  const selected = getSelectedLocales(value);

  useEffect(() => {
    const form = Array.from(document.forms).find((candidate) =>
      Boolean(candidate.elements.namedItem("subtitlePrimaryLocale")),
    );
    if (!form) {
      setHasSubtitleForm(false);
      return;
    }
    setHasSubtitleForm(true);

    const updateReadyLocales = () => {
      const nextReadyLocales = Array.from(form.elements)
        .flatMap((element) => {
          if (
            !(
              element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            )
          ) {
            return [];
          }
          const match = /^subtitleTracks\.([^.]*)$/.exec(element.name);
          return match?.[1] && element.value.trim() ? [match[1]] : [];
        })
        .sort();
      setReadyLocales(nextReadyLocales);

      const readyKey = nextReadyLocales.join("\u0000");
      if (initializedSelectionRef.current === null) {
        initializedSelectionRef.current = readyKey;
        if (nextReadyLocales.length) onChange(JSON.stringify(nextReadyLocales));
        return;
      }

      const nextSelected = selected.filter((locale) =>
        nextReadyLocales.includes(locale),
      );
      if (
        nextSelected.length !== selected.length ||
        initializedSelectionRef.current !== readyKey
      ) {
        initializedSelectionRef.current = readyKey;
        onChange(JSON.stringify(nextSelected));
      }
    };

    updateReadyLocales();
    form.addEventListener("change", updateReadyLocales);
    form.addEventListener("input", updateReadyLocales);
    return () => {
      form.removeEventListener("change", updateReadyLocales);
      form.removeEventListener("input", updateReadyLocales);
    };
  }, [onChange, selected]);

  function toggleLocale(locale: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selected, locale]))
      : selected.filter((item) => item !== locale);
    onChange(JSON.stringify(next));
  }

  if (!hasSubtitleForm) {
    return <ActionLocaleMultiSelect onChange={onChange} value={value} />;
  }

  return (
    <details
      className="rounded-md border border-zinc-700 bg-zinc-950 text-zinc-100"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-10 cursor-pointer px-3 py-2 text-sm marker:hidden">
        {selected.length
          ? `${selected.length} track${selected.length === 1 ? "" : "s"} selected`
          : "Select subtitle tracks..."}
      </summary>
      {open ? (
        <div className="grid max-h-64 gap-2 overflow-y-auto overscroll-contain border-t border-zinc-800 p-3">
          {readyLocales.length ? (
            readyLocales.map((locale) => (
              <div
                className="flex items-center gap-2 text-sm text-zinc-300"
                key={locale}
              >
                <Input
                  checked={selected.includes(locale)}
                  className="size-4 border-zinc-600"
                  id={`admin-action-subtitle-locale-${locale}`}
                  onChange={(event) =>
                    toggleLocale(locale, event.target.checked)
                  }
                  type="checkbox"
                />
                <Label
                  className="cursor-pointer text-sm font-normal text-zinc-300"
                  htmlFor={`admin-action-subtitle-locale-${locale}`}
                >
                  {locale}
                </Label>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500">
              No non-empty subtitle tracks are available on this form.
            </p>
          )}
        </div>
      ) : null}
    </details>
  );
}

function getSelectedLocales(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((locale): locale is string => typeof locale === "string")
      : [];
  } catch {
    return [];
  }
}

function getStringInputValue(value: string | boolean | undefined) {
  return typeof value === "string" ? value : undefined;
}

function resolveActionEndpoint(
  endpoint: string,
  input: AdminActionInputValues,
) {
  return endpoint.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (match, key) => {
    const value = input[key];
    return typeof value === "string" && value.trim()
      ? encodeURIComponent(value.trim())
      : match;
  });
}

function getFormControlStringValue(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  return control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
    ? control.value
    : "";
}

export function AdminActionPicker({
  actions,
  onSelect,
}: {
  actions: readonly AdminActionDefinition[];
  onSelect: (action: AdminActionDefinition) => void;
}) {
  const aiActions = actions.filter((action) => action.type === "ai");
  const standardActions = actions.filter((action) => action.type !== "ai");

  return (
    <Command className="border border-zinc-800 bg-zinc-950">
      <CommandInput placeholder="Search actions..." />
      <CommandList className="max-h-[min(28rem,60dvh)] overscroll-contain">
        <CommandEmpty>No actions match this search.</CommandEmpty>
        {aiActions.length ? (
          <ActionCommandGroup
            actions={aiActions}
            heading="AI actions"
            onSelect={onSelect}
          />
        ) : null}
        {standardActions.length ? (
          <ActionCommandGroup
            actions={standardActions}
            heading="Operations"
            onSelect={onSelect}
          />
        ) : null}
      </CommandList>
    </Command>
  );
}

function ActionCommandGroup({
  actions,
  heading,
  onSelect,
}: {
  actions: readonly AdminActionDefinition[];
  heading: string;
  onSelect: (action: AdminActionDefinition) => void;
}) {
  return (
    <CommandGroup heading={heading}>
      {actions.map((action) => (
        <CommandItem
          key={action.id}
          onSelect={() => onSelect(action)}
          value={`${action.title} ${action.description} ${action.id}`}
        >
          {action.type === "ai" ? (
            <Sparkles className="mt-0.5 size-4 shrink-0 text-yellow-300" />
          ) : null}
          <span className="grid gap-1">
            <span className="font-medium text-zinc-100">{action.title}</span>
            <span className="text-xs leading-5 text-zinc-400">
              {action.description}
            </span>
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
