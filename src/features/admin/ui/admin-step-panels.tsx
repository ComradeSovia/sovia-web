"use client";

import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

type FieldState = "changed" | "database" | "empty" | "invalid" | "warning";

const FIELD_STATE_LABELS: Record<FieldState, string> = {
  changed: "Modified",
  database: "Database",
  empty: "Empty",
  invalid: "Blocking error",
  warning: "Warning",
};

export function AdminDirtyForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const [dirty, setDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    updateFieldStates(form);

    const update = () => updateFieldStates(form);
    form.addEventListener("change", update);
    form.addEventListener("input", update);
    form.addEventListener("invalid", update, true);

    return () => {
      form.removeEventListener("change", update);
      form.removeEventListener("input", update);
      form.removeEventListener("invalid", update, true);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;

    const confirmLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const confirmNavigation = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(anchor.href);
    };

    window.addEventListener("beforeunload", confirmLeave);
    document.addEventListener("click", confirmNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", confirmLeave);
      document.removeEventListener("click", confirmNavigation, true);
    };
  }, [dirty]);

  function handleSubmit(_event: FormEvent<HTMLFormElement>) {
    setDirty(false);
  }

  return (
    <>
      <form
        action={action}
        className={className}
        data-admin-dirty-form="true"
        onChange={() => setDirty(true)}
        onSubmit={handleSubmit}
        ref={formRef}
        suppressHydrationWarning
      >
        {children}
      </form>
      <AdminConfirmDialog
        confirmLabel="Leave"
        message="You have unsaved changes in this step. Leave without saving?"
        onCancel={() => setPendingHref(null)}
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref(null);
          setDirty(false);
          if (href) {
            window.location.assign(href);
          }
        }}
        open={Boolean(pendingHref)}
        title="Unsaved changes"
      />
    </>
  );
}

export function AdminConfirmForm({
  action,
  children,
  className,
  message,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <form
        action={action}
        className={className}
        onSubmit={handleSubmit}
        ref={formRef}
      >
        {children}
      </form>
      <AdminConfirmDialog
        confirmLabel="Clear data"
        message={message}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          confirmedRef.current = true;
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
        open={open}
        title="Clear step data?"
        variant="danger"
      />
    </>
  );
}

export function AdminSubmitStatusButton({
  children,
  className,
  disabled,
  formAction,
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  formAction: (formData: FormData) => void | Promise<void>;
  pendingLabel: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={disabled || pending}
      formAction={formAction}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function AdminFormPendingMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return <p className={className}>{children}</p>;
}

export function AdminGenerateDescriptionButton({
  className,
  contentId,
  disabled,
}: {
  className?: string;
  contentId: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId)}/generate-description`,
        {
          body: JSON.stringify({
            generationNotes: getFormControlValue(form, "generationNotes"),
            promptKey: getFormControlValue(form, "promptKey"),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        introText?: string;
        message?: string;
        productionNotes?: string;
        shortDescription?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Description generation failed.");
      }

      setFormControlValue(form, "shortDescription", payload.shortDescription);
      setFormControlValue(form, "introText", payload.introText);
      setFormControlValue(form, "productionNotes", payload.productionNotes);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Description generation failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className={className}
        disabled={disabled || pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Generating..." : "Generate description"}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Generating description with the selected prompt...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminSuggestRelatedButton({
  className,
  contentId,
  disabled,
}: {
  className?: string;
  contentId: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [candidates, setCandidates] = useState<
    { reason: string; uid: string }[]
  >([]);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId)}/suggest-related`,
        {
          body: JSON.stringify({
            generationNotes: getFormControlValue(form, "generationNotes"),
            promptKey: getFormControlValue(form, "promptKey"),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        candidates?: { reason: string; uid: string }[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Related suggestion failed.");
      }

      setCandidates(payload.candidates ?? []);
    } catch (suggestionError) {
      setError(
        suggestionError instanceof Error
          ? suggestionError.message
          : "Related suggestion failed.",
      );
    } finally {
      setPending(false);
    }
  }

  function addCandidate(event: MouseEvent<HTMLButtonElement>, uid: string) {
    const form = event.currentTarget.form;
    if (!form) return;

    const currentValue = getFormControlValue(form, "relatedWorkUids") ?? "";
    const items = currentValue
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!items.includes(uid)) {
      items.push(uid);
    }
    setFormControlValue(form, "relatedWorkUids", items.join("\n"));
  }

  return (
    <div className="grid gap-3">
      <button
        className={className}
        disabled={disabled || pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Suggesting..." : "Suggest related"}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Finding related candidates...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {candidates.length ? (
        <div className="grid gap-2">
          {candidates.map((candidate) => (
            <div
              className="rounded-md border border-zinc-800 bg-zinc-950 p-3"
              key={candidate.uid}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-zinc-100">
                  {candidate.uid}
                </span>
                <button
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
                  onClick={(event) => addCandidate(event, candidate.uid)}
                  type="button"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                {candidate.reason}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminGenerateYoutubeLocalizationButton({
  className,
  contentId,
  disabled,
}: {
  className?: string;
  contentId: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const locale = getFormControlValue(form, "youtubePrimaryLocale");
    if (!locale) {
      setError("Select a primary YouTube language first.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId)}/generate-youtube-localization`,
        {
          body: JSON.stringify({
            generationNotes: getFormControlValue(form, "generationNotes"),
            locale,
            promptKey: getFormControlValue(
              form,
              "youtubeLocalizationPromptKey",
            ),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        description?: string;
        message?: string;
        title?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message || "YouTube localization generation failed.",
        );
      }

      setFormControlValue(
        form,
        `youtubeLocalization.${locale}.title`,
        payload.title,
      );
      setFormControlValue(
        form,
        `youtubeLocalization.${locale}.description`,
        payload.description,
      );
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "YouTube localization generation failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className={className}
        disabled={disabled || pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Generating..." : "Generate YouTube copy"}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Generating YouTube copy for the primary language...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminGenerateYoutubeLocalizationBatchButton({
  className,
  contentId,
  disabled,
}: {
  className?: string;
  contentId: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [translatedCount, setTranslatedCount] = useState<number | null>(null);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const sourceLocale = getFormControlValue(form, "youtubePrimaryLocale");
    if (!sourceLocale) {
      setError("Select a primary YouTube language first.");
      return;
    }

    const locales = getYoutubeLocalizationLocales(form);
    const targetLocales = locales.filter((locale) => locale !== sourceLocale);
    const sourceContent = getYoutubeLocalizationValues(form, [sourceLocale])[
      sourceLocale
    ];
    if (!sourceContent?.title?.trim() || !sourceContent.description?.trim()) {
      setError(
        "Primary YouTube language needs both title and description before translating all locales.",
      );
      return;
    }
    if (!targetLocales.length) {
      setError("No other YouTube languages are available to translate.");
      return;
    }

    setError(null);
    setTranslatedCount(null);
    setPending(true);

    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId)}/generate-youtube-localization-batch`,
        {
          body: JSON.stringify({
            generationNotes: getFormControlValue(form, "generationNotes"),
            promptKey: getFormControlValue(
              form,
              "youtubeLocalizationBatchPromptKey",
            ),
            sourceLocale,
            targetLocales,
            youtubeLocalization: getYoutubeLocalizationValues(form, locales),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        localizations?: {
          description: string;
          locale: string;
          title: string;
        }[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message || "YouTube localization batch generation failed.",
        );
      }

      const localizations = payload.localizations ?? [];
      if (!localizations.length) {
        throw new Error(
          "The model returned no translations. Check that the batch prompt returns locales exactly as requested.",
        );
      }

      for (const item of localizations) {
        setFormControlValue(
          form,
          `youtubeLocalization.${item.locale}.title`,
          item.title,
        );
        setFormControlValue(
          form,
          `youtubeLocalization.${item.locale}.description`,
          item.description,
        );
      }
      setTranslatedCount(localizations.length);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "YouTube localization batch generation failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className={className}
        disabled={disabled || pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Translating..." : "Translate all locales"}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Translating all other YouTube languages from the primary language...
        </p>
      ) : null}
      {translatedCount !== null ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Translated {translatedCount} YouTube locale
          {translatedCount === 1 ? "" : "s"} and applied them to the form.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminSyncYoutubeVideoButton({
  className,
  contentId,
  descriptionFieldName,
  disabled,
  titleFieldName,
}: {
  className?: string;
  contentId: string;
  descriptionFieldName: string;
  disabled?: boolean;
  titleFieldName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [synced, setSynced] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const title = getFormControlValue(form, titleFieldName);
    const description = getFormControlValue(form, descriptionFieldName);
    if (!title?.trim()) {
      setError("YouTube title is required before syncing.");
      return;
    }
    if (!description?.trim()) {
      setError("YouTube description is required before syncing.");
      return;
    }

    setError(null);
    setSynced(false);
    setPending(true);

    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId)}/sync-youtube-video`,
        {
          body: JSON.stringify({ description, title }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "YouTube video sync failed.");
      }

      setSynced(true);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "YouTube video sync failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className={className}
        disabled={disabled || pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Syncing..." : "Sync to YouTube video"}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Updating the YouTube video title and description...
        </p>
      ) : null}
      {synced ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Synced to YouTube video metadata.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminGeneratePlatformCopyButton({
  apiPath,
  className,
  contentId,
  disabled,
  label,
  tagsFieldName,
  titleFieldName,
  descriptionFieldName,
}: {
  apiPath:
    | "generate-bilibili-copy"
    | "generate-pixiv-copy"
    | "generate-vk-copy";
  className?: string;
  contentId: string;
  disabled?: boolean;
  label: string;
  tagsFieldName?: string;
  titleFieldName: string;
  descriptionFieldName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId)}/${apiPath}`,
        {
          body: JSON.stringify({
            generationNotes: getFormControlValue(form, "generationNotes"),
            promptKey: getFormControlValue(form, "platformCopyPromptKey"),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        description?: string;
        message?: string;
        tags?: string[];
        title?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || `${label} generation failed.`);
      }

      setFormControlValue(form, titleFieldName, payload.title);
      setFormControlValue(form, descriptionFieldName, payload.description);
      if (tagsFieldName && Array.isArray(payload.tags)) {
        setFormControlValue(form, tagsFieldName, payload.tags.join(", "));
      }
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : `${label} generation failed.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className={className}
        disabled={disabled || pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Generating..." : label}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Generating platform copy with the selected prompt...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getFormControlValue(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement ||
    control instanceof HTMLSelectElement
  ) {
    return control.value;
  }

  return undefined;
}

function getYoutubeLocalizationLocales(form: HTMLFormElement) {
  const locales = new Set<string>();

  for (const element of Array.from(form.elements)) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      const match = /^youtubeLocalization\.([^.]*)\.(title|description)$/.exec(
        element.name,
      );
      if (match?.[1]) {
        locales.add(match[1]);
      }
    }
  }

  return Array.from(locales);
}

function getYoutubeLocalizationValues(
  form: HTMLFormElement,
  locales: string[],
) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        description: getFormControlValue(
          form,
          `youtubeLocalization.${locale}.description`,
        ),
        title: getFormControlValue(form, `youtubeLocalization.${locale}.title`),
      },
    ]),
  );
}

function setFormControlValue(
  form: HTMLFormElement,
  name: string,
  value: string | undefined,
) {
  const control = form.elements.namedItem(name);
  if (
    !(
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement
    ) ||
    value === undefined
  ) {
    return;
  }

  control.value = value;
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function AdminConfirmDialog({
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "default",
}: {
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "danger" | "default";
}) {
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "border-red-500 bg-red-500 text-white hover:bg-red-400"
      : "border-zinc-100 bg-zinc-100 text-zinc-950 hover:bg-white";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
        role="dialog"
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`rounded-md border px-3 py-2 text-sm font-medium ${confirmClass}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function updateFieldStates(form: HTMLFormElement) {
  const fields = Array.from(
    form.querySelectorAll<HTMLElement>("[data-admin-db-field-name]"),
  );

  for (const field of fields) {
    const name = field.dataset.adminDbFieldName;
    if (!name) continue;

    const element = getNamedControl(form, name);
    if (!isFieldControl(element)) continue;

    const state = getFieldState(field, element);
    field.dataset.fieldState = state;

    const status = field.querySelector<HTMLElement>(
      "[data-admin-field-status]",
    );
    if (status) {
      status.textContent = FIELD_STATE_LABELS[state];
    }
  }
}

function getNamedControl(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  if (!(control instanceof RadioNodeList)) return control;
  return control.item(0);
}

function isFieldControl(value: unknown): value is FieldControl {
  return (
    value instanceof HTMLInputElement ||
    value instanceof HTMLTextAreaElement ||
    value instanceof HTMLSelectElement
  );
}

type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function getFieldState(field: HTMLElement, control: FieldControl): FieldState {
  const currentValue = normalizeFieldValue(getCurrentValue(control));
  const initialValue = normalizeFieldValue(getInitialValue(field, control));

  if (isInitializingSelect(control, currentValue, initialValue)) {
    return "database";
  }
  if (!control.validity.valid) return "invalid";
  if (hasSoftWarning(control, currentValue)) return "warning";
  if (currentValue !== initialValue) return "changed";
  if (!currentValue.trim()) return "empty";
  return "database";
}

function normalizeFieldValue(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function getCurrentValue(control: FieldControl) {
  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    return control.checked ? "on" : "";
  }

  return control.value;
}

function getInitialValue(field: HTMLElement, control: FieldControl) {
  if (field.dataset.adminInitialValue !== undefined) {
    return field.dataset.adminInitialValue;
  }

  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    return control.defaultChecked ? "on" : "";
  }

  if (control instanceof HTMLSelectElement) {
    return (
      Array.from(control.options).find((option) => option.defaultSelected)
        ?.value ?? ""
    );
  }

  return control.defaultValue;
}

function isInitializingSelect(
  control: FieldControl,
  currentValue: string,
  initialValue: string,
) {
  return (
    control instanceof HTMLSelectElement &&
    !currentValue &&
    Boolean(initialValue)
  );
}

function hasSoftWarning(control: FieldControl, value: string) {
  if (!value) return false;
  if (value !== value.trim()) return true;

  if (
    control instanceof HTMLInputElement &&
    control.type === "date" &&
    value > new Date().toISOString().slice(0, 10)
  ) {
    return true;
  }

  return (
    control instanceof HTMLInputElement &&
    control.dataset.adminWarning === "id" &&
    /^https?:\/\//i.test(value)
  );
}
