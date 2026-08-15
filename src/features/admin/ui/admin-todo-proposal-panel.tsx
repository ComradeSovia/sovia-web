"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionViewProps } from "../actions/views";
import {
  createAdminMusicTodoBatchAction,
  deleteAdminMusicTodoAction,
} from "../todo-actions";
import { AdminConfirmForm } from "./admin-step-panels";

const BUTTON_CLASS =
  "border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700";

type ProposalDraft = {
  from: string;
  id: string;
  notes: string;
  selected: boolean;
  sourceArtists: string;
  sourceUrl: string;
  title: string;
};

export function AdminTodoEditActionView({
  action,
  busy,
  execute,
  renderInput,
  run,
  setInputValue,
}: AdminActionViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const todoId = typeof run.input.todoId === "string" ? run.input.todoId : "";
  const setInputValueRef = useRef(setInputValue);
  setInputValueRef.current = setInputValue;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const returnTo = getTodoReturnTo(pathname, searchParams);

  useEffect(() => {
    if (!todoId) {
      setLoading(false);
      setLoadError("Todo ID is required.");
      return;
    }

    const controller = new AbortController();
    async function loadTodo() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(
          `/admin/api/todo/${encodeURIComponent(todoId)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as Record<string, unknown> & {
          message?: string;
        };
        if (!response.ok) {
          throw new Error(payload.message || "Todo could not be loaded.");
        }
        for (const key of [
          "title",
          "from",
          "sourceArtists",
          "sourceUrl",
          "notes",
        ]) {
          setInputValueRef.current(key, getString(payload[key]));
        }
        setStatus(getString(payload.status));
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error ? error.message : "Todo could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTodo();
    return () => controller.abort();
  }, [todoId]);

  return (
    <div className="grid gap-4">
      {loading ? (
        <p className="text-sm text-zinc-400">Loading Todo...</p>
      ) : null}
      {!loading && !loadError ? action.inputs.map(renderInput) : null}
      {loadError || run.error ? (
        <p className="text-sm text-red-300">{loadError || run.error}</p>
      ) : null}
      {!loading && !loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
          {status !== "COMPLETED" ? (
            <AdminConfirmForm
              action={deleteAdminMusicTodoAction}
              confirmLabel="Delete Todo"
              message="Delete this Todo? This cannot be undone. Any linked Content record will remain unchanged."
            >
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="todoId" type="hidden" value={todoId} />
              <Button type="submit" variant="destructive">
                <Trash2 className="size-4" />
                Delete
              </Button>
            </AdminConfirmForm>
          ) : (
            <span />
          )}
          <Button
            className={BUTTON_CLASS}
            disabled={busy}
            onClick={execute}
            type="button"
          >
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminTodoProposalActionView({
  action,
  busy,
  execute,
  renderInput,
  run,
}: AdminActionViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [proposals, setProposals] = useState<ProposalDraft[]>([]);

  useEffect(() => {
    setProposals(parseProposalOutput(run.output));
  }, [run.output]);

  const selected = proposals.filter((proposal) => proposal.selected);
  const returnTo = getTodoReturnTo(pathname, searchParams);

  function updateProposal(
    id: string,
    key: keyof Omit<ProposalDraft, "id">,
    value: boolean | string,
  ) {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.id === id ? { ...proposal, [key]: value } : proposal,
      ),
    );
  }

  return (
    <div className="grid gap-4">
      {action.inputs.map(renderInput)}
      {run.error ? <p className="text-sm text-red-300">{run.error}</p> : null}

      <div className="flex justify-end">
        <Button
          className={BUTTON_CLASS}
          disabled={busy}
          onClick={execute}
          type="button"
        >
          <Sparkles className="size-4" />
          {run.output === undefined ? "Analyze proposals" : "Analyze again"}
        </Button>
      </div>

      {proposals.length ? (
        <form action={createAdminMusicTodoBatchAction} className="grid gap-4">
          <input name="returnTo" type="hidden" value={returnTo} />
          <input
            name="proposals"
            type="hidden"
            value={JSON.stringify(
              selected.map(
                ({ id: _id, selected: _selected, ...proposal }) => proposal,
              ),
            )}
          />
          <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
            <span>{proposals.length} generated</span>
            <span>{selected.length} selected</span>
          </div>
          <div className="grid max-h-[50dvh] gap-3 overflow-y-auto overscroll-contain pr-1">
            {proposals.map((proposal, index) => (
              <article
                className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3"
                key={proposal.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <Label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                    <Input
                      checked={proposal.selected}
                      className="size-4"
                      onChange={(event) =>
                        updateProposal(
                          proposal.id,
                          "selected",
                          event.target.checked,
                        )
                      }
                      type="checkbox"
                    />
                    Proposal {index + 1}
                  </Label>
                  <Button
                    aria-label={`Remove proposal ${index + 1}`}
                    className="size-8 text-zinc-400 hover:text-red-300"
                    onClick={() =>
                      setProposals((current) =>
                        current.filter((item) => item.id !== proposal.id),
                      )
                    }
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <DraftField
                  label="Song title"
                  onChange={(value) =>
                    updateProposal(proposal.id, "title", value)
                  }
                  required
                  placeholder="Song you want to adapt"
                  value={proposal.title}
                />
                <DraftField
                  label="From"
                  onChange={(value) =>
                    updateProposal(proposal.id, "from", value)
                  }
                  placeholder="Work this song comes from"
                  value={proposal.from}
                />
                <DraftField
                  label="Source artists"
                  onChange={(value) =>
                    updateProposal(proposal.id, "sourceArtists", value)
                  }
                  placeholder="Original artist or author"
                  value={proposal.sourceArtists}
                />
                <DraftField
                  label="Source URL"
                  onChange={(value) =>
                    updateProposal(proposal.id, "sourceUrl", value)
                  }
                  placeholder="YouTube, Spotify, or Apple Music URL"
                  type="url"
                  value={proposal.sourceUrl}
                />
                <Label className="grid gap-1 text-xs text-zinc-400">
                  Notes
                  <Textarea
                    className="min-h-20 border-zinc-700 bg-zinc-900 text-zinc-100"
                    onChange={(event) =>
                      updateProposal(proposal.id, "notes", event.target.value)
                    }
                    placeholder="Adaptation ideas and direction"
                    value={proposal.notes}
                  />
                </Label>
              </article>
            ))}
          </div>
          <Button
            className={BUTTON_CLASS}
            disabled={!selected.length}
            type="submit"
          >
            Add {selected.length || "selected"} Todo
            {selected.length === 1 ? "" : "s"}
          </Button>
        </form>
      ) : run.status === "succeeded" ? (
        <p className="text-sm text-zinc-400">
          No usable Todo proposals were returned.
        </p>
      ) : null}
    </div>
  );
}

function DraftField({
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "url";
  value: string;
}) {
  return (
    <Label className="grid gap-1 text-xs text-zinc-400">
      {label}
      <Input
        className="border-zinc-700 bg-zinc-900 text-zinc-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </Label>
  );
}

function parseProposalOutput(output: unknown): ProposalDraft[] {
  if (!output || typeof output !== "object" || Array.isArray(output)) return [];
  const proposals = (output as Record<string, unknown>).proposals;
  if (!Array.isArray(proposals)) return [];

  return proposals.flatMap((proposal, index) => {
    if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
      return [];
    }
    const value = proposal as Record<string, unknown>;
    const title = getString(value.title);
    if (!title) return [];
    return [
      {
        from: getString(value.from),
        id: `${Date.now()}-${index}`,
        notes: getString(value.notes),
        selected: true,
        sourceArtists: getString(value.sourceArtists),
        sourceUrl: getString(value.sourceUrl),
        title,
      },
    ];
  });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getTodoReturnTo(pathname: string, searchParams: URLSearchParams) {
  const filter = searchParams.get("filter");
  return pathname === "/admin/todo" && filter
    ? `/admin/todo?filter=${encodeURIComponent(filter)}`
    : "/admin/todo";
}
