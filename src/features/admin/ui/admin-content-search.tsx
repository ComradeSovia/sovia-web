"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export type ContentSearchSuggestions = {
  artists: string[];
  contentIds: string[];
  ips: string[];
  series: string[];
  tags: string[];
  workTypes: string[];
};

type Completion = {
  detail?: string;
  label: string;
  value: string;
};

const FIELD_COMPLETIONS: Completion[] = [
  { detail: "Match a series", label: "Series", value: "series:" },
  { detail: "Match a song or source title", label: "Title", value: "title:" },
  { detail: "Match an artist", label: "Artist", value: "artist:" },
  { detail: "Match a source IP", label: "IP", value: "ip:" },
  {
    detail: "Match a content, path, or platform ID",
    label: "ID",
    value: "id:",
  },
  {
    detail: "Has one of these platforms",
    label: "Platform",
    value: "platform:",
  },
  {
    detail: "Has every listed platform",
    label: "Include platforms",
    value: "platform_includes:",
  },
  {
    detail: "Has none of the listed platforms",
    label: "Exclude platforms",
    value: "platform_not_includes:",
  },
  { detail: "Matches a Pixiv tag", label: "Tag", value: "tag:" },
  {
    detail: "Has every listed tag",
    label: "Include tags",
    value: "tag_includes:",
  },
  {
    detail: "Has none of the listed tags",
    label: "Exclude tags",
    value: "tag_not_includes:",
  },
  { detail: "true or false", label: "Visible", value: "visible:" },
  { detail: "O, CO, R, LC, or C", label: "Work type", value: "work_type:" },
];

const PLATFORM_OPTIONS = [
  { label: "YouTube", value: "youtube" },
  { label: "Bilibili", value: "bilibili" },
  { label: "VK", value: "vk" },
  { label: "Pixiv", value: "pixiv" },
];

export function ContentSearchInput({
  defaultValue,
  suggestions,
}: {
  defaultValue: string;
  suggestions: ContentSearchSuggestions;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const completions = useMemo(
    () => getCompletions(value, suggestions),
    [suggestions, value],
  );

  function selectCompletion(completion: Completion) {
    setValue(replaceCurrentToken(value, completion.value));
    setActiveIndex(0);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <Input
        aria-autocomplete="list"
        aria-controls="admin-content-search-suggestions"
        aria-expanded={isOpen && completions.length > 0}
        autoComplete="off"
        className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
        id="admin-content-search"
        name="q"
        onChange={(event) => {
          setValue(event.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
            return;
          }
          if (!completions.length) return;

          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex(
              (index) =>
                (index + direction + completions.length) % completions.length,
            );
            setIsOpen(true);
            return;
          }

          if (
            isOpen &&
            (event.key === "Enter" || event.key === "Tab") &&
            completions[activeIndex]
          ) {
            event.preventDefault();
            selectCompletion(completions[activeIndex]);
          }
        }}
        placeholder='Search or choose a filter, e.g. series:"..."'
        ref={inputRef}
        role="combobox"
        title="Start typing a filter name to see available search options."
        value={value}
      />
      {isOpen && completions.length ? (
        <div
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-950 p-1 shadow-xl"
          id="admin-content-search-suggestions"
          role="listbox"
        >
          {completions.map((completion, index) => (
            <button
              className={`flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm ${
                index === activeIndex
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-300 hover:bg-zinc-900"
              }`}
              key={`${completion.value}-${index}`}
              onMouseDown={(event) => {
                event.preventDefault();
                selectCompletion(completion);
              }}
              role="option"
              type="button"
            >
              <span className="font-mono text-xs">{completion.value}</span>
              {completion.detail ? (
                <span className="text-xs text-zinc-500">
                  {completion.detail}
                </span>
              ) : (
                <span className="text-xs text-zinc-500">
                  {completion.label}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getCompletions(query: string, suggestions: ContentSearchSuggestions) {
  const token = getCurrentToken(query);
  const fieldMatch = token.match(/^(-?)([a-z_]+):(.*)$/i);

  if (!fieldMatch) {
    const normalizedToken = normalizeText(token);
    return FIELD_COMPLETIONS.filter((completion) =>
      normalizeText(completion.value).includes(normalizedToken),
    ).slice(0, 8);
  }

  const [, prefix, field, rawValue] = fieldMatch;
  const values = getFieldValues(field.toLowerCase(), suggestions);
  if (!values) return [];

  const commaIndex = rawValue.lastIndexOf(",");
  const selectedPrefix =
    commaIndex >= 0 ? rawValue.slice(0, commaIndex + 1) : "";
  const queryValue = normalizeText(rawValue.slice(commaIndex + 1));

  return values
    .filter((value) => normalizeText(value.value).includes(queryValue))
    .slice(0, 8)
    .map((value) => ({
      ...value,
      value: `${prefix}${field}:${selectedPrefix}${formatFieldValue(value.value)}`,
    }));
}

function getFieldValues(
  field: string,
  suggestions: ContentSearchSuggestions,
): Completion[] | null {
  switch (field) {
    case "platform":
    case "platform_includes":
    case "platform_not_includes":
      return PLATFORM_OPTIONS;
    case "tag":
    case "tag_includes":
    case "tag_not_includes":
      return suggestions.tags.map(toCompletion);
    case "series":
      return suggestions.series.map(toCompletion);
    case "artist":
    case "artists":
      return suggestions.artists.map(toCompletion);
    case "ip":
      return suggestions.ips.map(toCompletion);
    case "id":
    case "cid":
    case "path":
      return suggestions.contentIds.map(toCompletion);
    case "visible":
      return [
        { label: "Visible", value: "true" },
        { label: "Hidden", value: "false" },
      ];
    case "work_type":
    case "type":
      return suggestions.workTypes.map(toCompletion);
    default:
      return null;
  }
}

function getCurrentToken(value: string) {
  let quoted = false;
  let tokenStart = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') quoted = !quoted;
    if (/\s/.test(character) && !quoted) tokenStart = index + 1;
  }

  return value.slice(tokenStart);
}

function replaceCurrentToken(value: string, replacement: string) {
  const token = getCurrentToken(value);
  return `${value.slice(0, value.length - token.length)}${replacement}`;
}

function toCompletion(value: string): Completion {
  return { label: value, value };
}

function formatFieldValue(value: string) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function normalizeText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll('"', "").trim();
}
