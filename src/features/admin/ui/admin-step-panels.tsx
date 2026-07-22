"use client";

import { Check, Copy, Download, Upload } from "lucide-react";
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

export function AdminCopyFieldButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget.form;
    if (!form) return;

    const value = getFormControlValue(form, name) ?? "";
    if (!value) {
      setCopied(false);
      setError(true);
      window.setTimeout(() => setError(false), 1400);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
      setError(true);
      window.setTimeout(() => setError(false), 1400);
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <button
      aria-label={`Copy ${name}`}
      className="inline-grid h-5 w-5 place-items-center rounded-sm border border-zinc-800 bg-zinc-950 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 group-data-[field-state=changed]:border-yellow-400/30 group-data-[field-state=changed]:text-yellow-200 group-data-[field-state=database]:border-sky-500/30 group-data-[field-state=database]:text-sky-200 group-data-[field-state=invalid]:border-red-500/30 group-data-[field-state=invalid]:text-red-200 group-data-[field-state=warning]:border-orange-500/30 group-data-[field-state=warning]:text-orange-200"
      onClick={handleClick}
      title={error ? "Nothing to copy" : copied ? "Copied" : "Copy value"}
      type="button"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
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
  disabled,
  labels,
  locales,
}: {
  className?: string;
  contentId: string;
  disabled?: boolean;
  labels: Record<string, string>;
  locales: readonly string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [synced, setSynced] = useState(false);
  const [selectedLocales, setSelectedLocales] = useState<string[]>([]);
  const primaryLocaleRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(
      `form:has(input[name="youtubePrimaryLocale"])`,
    );
    if (!form) return;

    const updateSelection = () => {
      const primaryLocale = getFormControlValue(form, "youtubePrimaryLocale");
      if (primaryLocaleRef.current === primaryLocale) return;
      primaryLocaleRef.current = primaryLocale;
      setSelectedLocales(locales.filter((locale) => locale !== primaryLocale));
    };
    updateSelection();
    form.addEventListener("change", updateSelection);
    return () => form.removeEventListener("change", updateSelection);
  }, [locales]);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const primaryLocale = getFormControlValue(form, "youtubePrimaryLocale");
    const title = getFormControlValue(
      form,
      `youtubeLocalization.${primaryLocale}.title`,
    );
    const description = getFormControlValue(
      form,
      `youtubeLocalization.${primaryLocale}.description`,
    );
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
          body: JSON.stringify({
            description,
            localizations: Object.fromEntries(
              selectedLocales.map((locale) => [
                locale,
                {
                  description: getFormControlValue(
                    form,
                    `youtubeLocalization.${locale}.description`,
                  ),
                  title: getFormControlValue(
                    form,
                    `youtubeLocalization.${locale}.title`,
                  ),
                },
              ]),
            ),
            title,
          }),
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
      <div className="grid gap-2">
        <span className="text-xs font-medium text-zinc-300">Languages</span>
        <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-3">
          {locales.map((locale) => (
            <label
              className="flex items-center gap-2 text-sm text-zinc-300"
              key={locale}
            >
              <input
                checked={selectedLocales.includes(locale)}
                className="h-4 w-4 accent-zinc-100"
                onChange={(event) =>
                  setSelectedLocales((current) =>
                    event.target.checked
                      ? [...current, locale]
                      : current.filter((item) => item !== locale),
                  )
                }
                type="checkbox"
              />
              <span>
                {locale} · {labels[locale] ?? locale}
              </span>
            </label>
          ))}
        </div>
      </div>
      <button
        className={className}
        disabled={disabled || pending || !selectedLocales.length}
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
          Synced the primary metadata and {selectedLocales.length}{" "}
          localization(s) to YouTube.
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

export function AdminGenerateSubtitleLocalizationBatchButton({
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
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const sourceLocale = getFormControlValue(form, "subtitlePrimaryLocale");
    if (!sourceLocale) {
      setError("Select a primary subtitle language first.");
      return;
    }

    const locales = getSubtitleLocales(form);
    const targetLocales = locales.filter((locale) => locale !== sourceLocale);
    const subtitleTracks = getSubtitleTrackValues(form, locales);
    const sourceSrt = subtitleTracks[sourceLocale];
    if (!sourceSrt?.trim()) {
      setError(
        "Primary subtitle language needs SRT content before translating all subtitle locales.",
      );
      return;
    }
    if (!targetLocales.length) {
      setError("No other subtitle languages are available to translate.");
      return;
    }

    setError(null);
    setTranslatedCount(null);
    setProgress({ done: 0, total: targetLocales.length });
    setPending(true);

    const generationNotes = getFormControlValue(
      form,
      "subtitleGenerationNotes",
    );
    const promptKey = getFormControlValue(
      form,
      "subtitleLocalizationBatchPromptKey",
    );

    // Translating every locale in one request exceeds Cloudflare's ~100s proxy
    // limit and returns a 504. Long Suno lyric subtitles need a smaller batch
    // so every target has enough output-token headroom.
    const subtitleLocalesPerRequest = getSubtitleLocalesPerRequest(
      sourceSrt.length,
    );
    // Batches after the first run with a small concurrency pool to speed things
    // up; the first batch runs alone to warm the shared prompt cache so the
    // concurrent ones are cache hits rather than all missing at once.
    const subtitleRequestConcurrency = subtitleLocalesPerRequest === 1 ? 1 : 2;
    const batches: string[][] = [];
    for (
      let index = 0;
      index < targetLocales.length;
      index += subtitleLocalesPerRequest
    ) {
      batches.push(
        targetLocales.slice(index, index + subtitleLocalesPerRequest),
      );
    }

    let translated = 0;
    const failedLocales: string[] = [];

    // Capture control-flow-narrowed values so the nested closure keeps them
    // non-nullable.
    const activeForm = form;
    const activeSourceLocale = sourceLocale;

    async function runBatch(batch: string[]) {
      try {
        const response = await fetch(
          `/admin/api/content/${encodeURIComponent(contentId)}/generate-subtitle-localization-batch`,
          {
            body: JSON.stringify({
              generationNotes,
              promptKey,
              sourceLocale: activeSourceLocale,
              subtitleTracks: {
                [activeSourceLocale]: sourceSrt,
                ...Object.fromEntries(
                  batch.map((locale) => [locale, subtitleTracks[locale]]),
                ),
              },
              targetLocales: batch,
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          },
        );

        if (response.status === 504) {
          throw new Error(
            "Timed out while translating these locales. Try fewer subtitle languages, or the SRT may be too long.",
          );
        }

        const payload = (await response.json()) as {
          localizations?: {
            locale: string;
            srt: string;
          }[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.message || "Subtitle localization batch generation failed.",
          );
        }

        const localizations = payload.localizations ?? [];
        for (const locale of batch) {
          const item = localizations.find((entry) => entry.locale === locale);
          if (item) {
            setFormControlValue(
              activeForm,
              `subtitleTracks.${item.locale}`,
              item.srt,
            );
            translated += 1;
          } else {
            failedLocales.push(locale);
          }
        }
      } catch {
        failedLocales.push(...batch);
      }
      setProgress({
        done: translated + failedLocales.length,
        total: targetLocales.length,
      });
    }

    try {
      // Warm the prompt cache with the first batch, then fan out the rest.
      if (batches.length) {
        await runBatch(batches[0]);
      }
      let cursor = 1;
      async function worker() {
        while (cursor < batches.length) {
          const index = cursor;
          cursor += 1;
          await runBatch(batches[index]);
        }
      }
      await Promise.all(
        Array.from(
          { length: Math.min(subtitleRequestConcurrency, batches.length - 1) },
          () => worker(),
        ),
      );

      setTranslatedCount(translated);
      if (failedLocales.length) {
        setError(
          `Translated ${translated} of ${targetLocales.length} locales. Failed: ${failedLocales.join(", ")}. Retry to translate the remaining locales.`,
        );
      }
    } finally {
      setProgress(null);
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
        {pending ? "Translating..." : "Translate all subtitles"}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          {progress
            ? `Translating subtitle languages... ${progress.done}/${progress.total}`
            : "Translating SRT subtitles into all other subtitle languages..."}
        </p>
      ) : null}
      {translatedCount !== null ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Translated {translatedCount} subtitle locale
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

export function AdminDownloadSubtitlesButton({
  className,
  contentId,
  labels,
  locales,
}: {
  className?: string;
  contentId: string;
  labels: Record<string, string>;
  locales: readonly string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState("");

  function handleDownloadAll(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const safeContentId = sanitizeFilenamePart(contentId);
    const files = locales.flatMap((locale) => {
      const srt = getFormControlValue(form, `subtitleTracks.${locale}`)?.trim();
      return srt
        ? [
            {
              data: new TextEncoder().encode(`${srt}\n`),
              name: `sovia_${safeContentId}_${sanitizeFilenamePart(locale)}.srt`,
            },
          ]
        : [];
    });

    if (!files.length) {
      setError("Add at least one subtitle track before downloading.");
      return;
    }

    setError(null);
    const zip = createStoredZip(files);
    const url = URL.createObjectURL(
      new Blob([zip], { type: "application/zip" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `sovia_${safeContentId}_captions.zip`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function handleDownloadSelected(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || !selectedLocale) return;

    const srt = getFormControlValue(
      form,
      `subtitleTracks.${selectedLocale}`,
    )?.trim();
    if (!srt) {
      setError(`Add SRT content for ${selectedLocale} before downloading.`);
      return;
    }

    setError(null);
    const safeContentId = sanitizeFilenamePart(contentId);
    const safeLocale = sanitizeFilenamePart(selectedLocale);
    const url = URL.createObjectURL(
      new Blob([new TextEncoder().encode(`${srt}\n`)], {
        type: "application/x-subrip;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `sovia_${safeContentId}_${safeLocale}.srt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="grid gap-2">
      <button className={className} onClick={handleDownloadAll} type="button">
        <Download className="mr-2 h-4 w-4" />
        Download all subtitles
      </button>
      <p className="text-xs leading-5 text-zinc-500">
        Downloads every non-empty subtitle track as UTF-8 SRT in one ZIP file.
      </p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          className="h-10 min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          onChange={(event) => setSelectedLocale(event.target.value)}
          value={selectedLocale}
        >
          <option value="">Select subtitle language</option>
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {locale} - {labels[locale] ?? locale}
            </option>
          ))}
        </select>
        <button
          className={className}
          disabled={!selectedLocale}
          onClick={handleDownloadSelected}
          type="button"
        >
          <Download className="mr-2 h-4 w-4" />
          Download subtitle
        </button>
      </div>
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminSyncYoutubeCaptionsButton({
  className,
  contentId,
  disabled,
  labels,
  locales,
}: {
  className?: string;
  contentId: string;
  disabled?: boolean;
  labels: Record<string, string>;
  locales: readonly string[];
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [readyLocales, setReadyLocales] = useState<string[]>([]);
  const [selectedLocales, setSelectedLocales] = useState<string[]>([]);
  const [synced, setSynced] = useState<{
    count: number;
    estimatedQuotaUnits: number;
  } | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(
      `form:has(input[name="subtitlePrimaryLocale"])`,
    );
    if (!form) return;

    const updateSelection = () => {
      const readyLocales = locales.filter((locale) =>
        getFormControlValue(form, `subtitleTracks.${locale}`)?.trim(),
      );
      setReadyLocales(readyLocales);

      setSelectedLocales((current) => {
        if (!initializedRef.current) {
          initializedRef.current = true;
          return readyLocales;
        }
        return current.filter((locale) => readyLocales.includes(locale));
      });
    };

    updateSelection();
    form.addEventListener("change", updateSelection);
    form.addEventListener("input", updateSelection);
    return () => {
      form.removeEventListener("change", updateSelection);
      form.removeEventListener("input", updateSelection);
    };
  }, [locales]);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const tracks = getSubtitleTrackValues(form, [...locales]);
    const selectedTracks = Object.fromEntries(
      selectedLocales.map((locale) => [locale, tracks[locale]]),
    );
    const nonEmptyTracks = Object.fromEntries(
      Object.entries(selectedTracks).filter(([, srt]) => srt?.trim()),
    ) as Record<string, string>;

    if (!Object.keys(nonEmptyTracks).length) {
      setError("Select at least one non-empty subtitle track before syncing.");
      return;
    }
    if (!confirmed) {
      setError("Confirm the high quota cost before syncing captions.");
      return;
    }

    setError(null);
    setSynced(null);
    setPending(true);

    try {
      const response = await fetch(
        `/admin/api/content/${encodeURIComponent(contentId)}/sync-youtube-captions`,
        {
          body: JSON.stringify({
            confirmHighCost: true,
            tracks: nonEmptyTracks,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        estimatedQuotaUnits?: number;
        message?: string;
        synced?: { language: string }[];
      };

      if (!response.ok) {
        throw new Error(payload.message || "YouTube captions sync failed.");
      }

      setSynced({
        count: payload.synced?.length ?? Object.keys(nonEmptyTracks).length,
        estimatedQuotaUnits: payload.estimatedQuotaUnits ?? 0,
      });
      setConfirmed(false);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "YouTube captions sync failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2 border-t border-zinc-800 pt-3">
      <div className="grid gap-2">
        <span className="text-xs font-medium text-zinc-300">
          Subtitle tracks
        </span>
        <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-3">
          {locales.map((locale) => {
            const hasTrack = readyLocales.includes(locale);
            return (
              <label
                className="flex items-center gap-2 text-sm text-zinc-300 has-disabled:text-zinc-600"
                key={locale}
              >
                <input
                  checked={selectedLocales.includes(locale)}
                  className="h-4 w-4 accent-zinc-100 disabled:accent-zinc-700"
                  disabled={disabled || pending || !hasTrack}
                  onChange={(event) =>
                    setSelectedLocales((current) =>
                      event.target.checked
                        ? [...current, locale]
                        : current.filter((item) => item !== locale),
                    )
                  }
                  suppressHydrationWarning
                  type="checkbox"
                />
                <span>
                  {locale} · {labels[locale] ?? locale}
                  {hasTrack ? "" : " · No SRT"}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-zinc-500">
          Only selected non-empty SRT tracks will be uploaded to YouTube.
        </p>
      </div>
      <label className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-5 text-amber-100">
        <input
          checked={confirmed}
          className="mt-0.5 h-4 w-4 accent-amber-200"
          disabled={disabled || pending}
          onChange={(event) => setConfirmed(event.target.checked)}
          suppressHydrationWarning
          type="checkbox"
        />
        <span>
          I understand this uses YouTube Data API quota: 50 units to inspect
          captions, then 400 units for each new track or 450 units for each
          updated track.
        </span>
      </label>
      <button
        className={className}
        disabled={disabled || pending || !confirmed || !selectedLocales.length}
        onClick={handleClick}
        type="button"
      >
        <Upload className="mr-2 h-4 w-4" />
        {pending ? "Syncing captions..." : "Sync subtitles to YouTube"}
      </button>
      {pending ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Uploading selected SRT subtitle tracks to YouTube captions...
        </p>
      ) : null}
      {synced ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Synced {synced.count} subtitle track{synced.count === 1 ? "" : "s"}.
          Estimated quota: {synced.estimatedQuotaUnits} units.
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

function sanitizeFilenamePart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "_") || "unknown";
}

function createStoredZip(files: { data: Uint8Array; name: string }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.data);
    const local = new Uint8Array(30 + name.length + file.data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, file.data.length, true);
    localView.setUint32(22, file.data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(file.data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, file.data.length, true);
    centralView.setUint32(24, file.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length;
  }

  const centralSize = centralParts.reduce(
    (size, part) => size + part.length,
    0,
  );
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const result = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    result.set(part, cursor);
    cursor += part.length;
  }
  return result;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
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

function getSubtitleLocalesPerRequest(sourceSrtLength: number) {
  if (sourceSrtLength > 4_500) return 1;
  if (sourceSrtLength > 2_500) return 2;
  return 3;
}

function getSubtitleLocales(form: HTMLFormElement) {
  const locales = new Set<string>();

  for (const element of Array.from(form.elements)) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      const match = /^subtitleTracks\.([^.]*)$/.exec(element.name);
      if (match?.[1]) {
        locales.add(match[1]);
      }
    }
  }

  return Array.from(locales);
}

function getSubtitleTrackValues(form: HTMLFormElement, locales: string[]) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      getFormControlValue(form, `subtitleTracks.${locale}`),
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
    value > getLocalDateInputValue(new Date())
  ) {
    return true;
  }

  return (
    control instanceof HTMLInputElement &&
    control.dataset.adminWarning === "id" &&
    /^https?:\/\//i.test(value)
  );
}

function getLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
