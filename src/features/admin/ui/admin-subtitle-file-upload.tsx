"use client";

import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type UploadResult = {
  applied: { filename: string; locale: string; replaced: boolean }[];
  skipped: { filename: string; reason: string }[];
};

export function AdminSubtitleFileUpload({
  labels,
  locales,
}: {
  labels: Record<string, string>;
  locales: readonly string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function applyFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    const form =
      inputRef.current?.closest("form") ?? getSubtitleEditorForm() ?? null;
    if (!form) {
      setResult({
        applied: [],
        skipped: fileArray.map((file) => ({
          filename: file.name,
          reason: "Subtitle form was not found.",
        })),
      });
      return;
    }

    setReading(true);
    const nextResult: UploadResult = { applied: [], skipped: [] };
    const claimedLocales = new Set<string>();

    for (const file of fileArray) {
      if (!file.name.toLowerCase().endsWith(".srt")) {
        nextResult.skipped.push({
          filename: file.name,
          reason: "Only .srt files are supported.",
        });
        continue;
      }

      const locale = matchSubtitleLocale(file.name, locales, labels);
      if (!locale) {
        nextResult.skipped.push({
          filename: file.name,
          reason: `No language code matched. Use one of: ${locales.join(", ")}.`,
        });
        continue;
      }
      if (claimedLocales.has(locale)) {
        nextResult.skipped.push({
          filename: file.name,
          reason: `Another selected file already matched ${locale}.`,
        });
        continue;
      }

      const control = form.elements.namedItem(`subtitleTracks.${locale}`);
      if (!(control instanceof HTMLTextAreaElement)) {
        nextResult.skipped.push({
          filename: file.name,
          reason: `The ${locale} subtitle field is not available.`,
        });
        continue;
      }

      try {
        const content = (await readSubtitleFile(file)).trim();
        if (!content) {
          nextResult.skipped.push({
            filename: file.name,
            reason: "The file is empty.",
          });
          continue;
        }

        const replaced = Boolean(control.value.trim());
        control.value = content;
        control.dispatchEvent(new Event("input", { bubbles: true }));
        control.dispatchEvent(new Event("change", { bubbles: true }));
        claimedLocales.add(locale);
        nextResult.applied.push({ filename: file.name, locale, replaced });
      } catch {
        nextResult.skipped.push({
          filename: file.name,
          reason: "The file could not be read.",
        });
      }
    }

    setResult(nextResult);
    setReading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void applyFiles(event.target.files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void applyFiles(event.dataTransfer.files);
  }

  return (
    <div className="grid gap-3">
      <section
        aria-label="Upload subtitle files"
        className={`rounded-md border border-dashed p-5 text-center transition-colors ${
          dragging
            ? "border-sky-400 bg-sky-500/10"
            : "border-zinc-700 bg-zinc-950/60"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setDragging(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-6 w-6 text-zinc-400" />
        <p className="mt-2 text-sm font-medium text-zinc-200">
          Drop multiple SRT files here
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Files are matched by language code in the filename, for example{" "}
          <span className="font-mono text-zinc-400">sovia_e9_ja.srt</span> or{" "}
          <span className="font-mono text-zinc-400">zh-CN.srt</span>.
        </p>
        <label className="mt-3 inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-100 hover:bg-zinc-800">
          {reading ? "Reading files..." : "Choose SRT files"}
          <input
            accept=".srt,application/x-subrip"
            className="sr-only"
            disabled={reading}
            multiple
            onChange={handleChange}
            ref={inputRef}
            type="file"
          />
        </label>
        <p className="mt-2 text-xs text-zinc-600">
          Matching files replace the current form values. Nothing is saved until
          you click Save subtitles.
        </p>
      </section>

      {result?.applied.length ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Applied {result.applied.length} subtitle file
            {result.applied.length === 1 ? "" : "s"} to the form
          </div>
          <ul className="mt-1 space-y-0.5 pl-6 text-xs text-emerald-200/80">
            {result.applied.map(({ filename, locale, replaced }) => (
              <li key={`${locale}:${filename}`}>
                {filename} → {locale}
                {replaced ? " (replaced existing text)" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result?.skipped.length ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            Skipped {result.skipped.length} file
            {result.skipped.length === 1 ? "" : "s"}
          </div>
          <ul className="mt-1 space-y-0.5 pl-6 text-xs text-amber-200/80">
            {result.skipped.map(({ filename, reason }) => (
              <li key={`${filename}:${reason}`}>
                {filename}: {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AdminSubtitleFileUploadActionView() {
  const [locales, setLocales] = useState<string[] | null>(null);

  useEffect(() => {
    const form = getSubtitleEditorForm();
    if (!form) return;

    setLocales(
      Array.from(form.elements).flatMap((element) => {
        if (!(element instanceof HTMLTextAreaElement)) return [];
        const match = /^subtitleTracks\.([^.]*)$/.exec(element.name);
        return match?.[1] ? [match[1]] : [];
      }),
    );
  }, []);

  if (!locales) {
    return (
      <p className="text-sm text-red-300">
        Open this action from the Subtitles editor.
      </p>
    );
  }

  return (
    <AdminSubtitleFileUpload
      labels={Object.fromEntries(locales.map((locale) => [locale, locale]))}
      locales={locales}
    />
  );
}

async function readSubtitleFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = bytes.subarray(2).slice();
    for (let index = 0; index + 1 < swapped.length; index += 2) {
      [swapped[index], swapped[index + 1]] = [
        swapped[index + 1],
        swapped[index],
      ];
    }
    return new TextDecoder("utf-16le").decode(swapped);
  }
  return new TextDecoder().decode(bytes).replace(/^\uFEFF/, "");
}

function matchSubtitleLocale(
  filename: string,
  locales: readonly string[],
  labels: Record<string, string>,
) {
  const basename = filename.replace(/\.srt$/i, "");
  const normalizedName = normalizeFilenamePart(basename);
  const aliases = locales.flatMap((locale) => {
    const normalizedLocale = normalizeFilenamePart(locale);
    const normalizedLabel = normalizeFilenamePart(labels[locale] ?? "");
    return [
      { alias: normalizedLocale, locale, priority: 2 },
      ...(normalizedLabel
        ? [{ alias: normalizedLabel, locale, priority: 1 }]
        : []),
    ];
  });

  const matches = aliases
    .filter(({ alias }) => hasFilenameToken(normalizedName, alias))
    .sort(
      (left, right) =>
        right.alias.length - left.alias.length ||
        right.priority - left.priority,
    );

  return matches[0]?.locale;
}

function normalizeFilenamePart(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hasFilenameToken(filename: string, token: string) {
  return (
    filename === token ||
    filename.startsWith(`${token}-`) ||
    filename.endsWith(`-${token}`) ||
    filename.includes(`-${token}-`)
  );
}

function getSubtitleEditorForm() {
  return Array.from(document.forms).find((candidate) =>
    Boolean(candidate.elements.namedItem("subtitlePrimaryLocale")),
  );
}
