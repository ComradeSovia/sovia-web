"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PromptListItem = {
  enabled: boolean;
  id: string;
  isDefault: boolean;
  key: string;
  model: string;
  task: string;
  title: string;
  variant: string;
};

export function AdminPromptList({
  options,
  prompts,
}: {
  options: readonly { label: string; value: string }[];
  prompts: PromptListItem[];
}) {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const promptCounts = new Map<string, number>();
  for (const prompt of prompts) {
    promptCounts.set(prompt.task, (promptCounts.get(prompt.task) ?? 0) + 1);
  }

  const knownTasks = new Set(options.map((option) => option.value));
  const filters = [
    ...options.filter((option) => promptCounts.has(option.value)),
    ...Array.from(promptCounts.keys())
      .filter((task) => !knownTasks.has(task))
      .map((task) => ({ label: task, value: task })),
  ];
  const visiblePrompts = selectedTask
    ? prompts.filter((prompt) => prompt.task === selectedTask)
    : prompts;

  return (
    <div className="grid gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filter prompts by task</legend>
        <button
          aria-pressed={selectedTask === null}
          className={getFilterClass(selectedTask === null)}
          onClick={() => setSelectedTask(null)}
          type="button"
        >
          All <span className="text-current/60">{prompts.length}</span>
        </button>
        {filters.map((filter) => {
          const selected = selectedTask === filter.value;
          return (
            <button
              aria-pressed={selected}
              className={getFilterClass(selected)}
              key={filter.value}
              onClick={() => setSelectedTask(filter.value)}
              title={filter.value}
              type="button"
            >
              {filter.label}{" "}
              <span className="text-current/60">
                {promptCounts.get(filter.value)}
              </span>
            </button>
          );
        })}
      </fieldset>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead className="text-zinc-400">Task</TableHead>
              <TableHead className="text-zinc-400">Variant</TableHead>
              <TableHead className="text-zinc-400">Title</TableHead>
              <TableHead className="text-zinc-400">Model</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-right text-zinc-400">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePrompts.map((prompt) => (
              <TableRow className="border-zinc-800" key={prompt.id}>
                <TableCell className="font-mono text-zinc-200">
                  {prompt.task}
                </TableCell>
                <TableCell className="font-mono text-zinc-400">
                  {prompt.variant}
                </TableCell>
                <TableCell className="text-zinc-100">{prompt.title}</TableCell>
                <TableCell className="font-mono text-zinc-400">
                  {prompt.model}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      prompt.isDefault
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                        : prompt.enabled
                          ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400"
                    }
                    variant="outline"
                  >
                    {prompt.isDefault
                      ? "default"
                      : prompt.enabled
                        ? "enabled"
                        : "disabled"}
                  </Badge>
                  {prompt.isDefault && !prompt.enabled ? (
                    <Badge
                      className="ml-2 border-zinc-700 bg-zinc-900 text-zinc-400"
                      variant="outline"
                    >
                      disabled
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    asChild
                    className="border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700"
                    size="sm"
                  >
                    <Link
                      href={`/admin/prompts/${encodeURIComponent(prompt.key)}`}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function getFilterClass(selected: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    selected
      ? "border-zinc-500 bg-zinc-100 text-zinc-950"
      : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
  }`;
}

const PromptTaskContext = createContext<{
  task: string;
  setTask: (task: string) => void;
} | null>(null);

export function AdminPromptTaskProvider({
  children,
  initialTask,
}: {
  children: ReactNode;
  initialTask: string;
}) {
  const [task, setTask] = useState(initialTask);

  return (
    <PromptTaskContext.Provider value={{ setTask, task }}>
      {children}
    </PromptTaskContext.Provider>
  );
}

export function AdminPromptTaskSelect({
  options,
  value,
}: {
  options: readonly { label: string; value: string }[];
  value: string;
}) {
  const context = usePromptTask();
  const id = useId();

  return (
    <div
      className="group grid gap-2"
      data-admin-db-field-name="task"
      data-admin-initial-value={value}
    >
      <Label
        className="flex items-center justify-between gap-2 text-xs font-medium normal-case tracking-normal text-zinc-300"
        htmlFor={id}
      >
        <span>Task</span>
        <span
          className="rounded-sm bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-500 group-data-[field-state=changed]:bg-yellow-400/10 group-data-[field-state=changed]:text-yellow-200 group-data-[field-state=database]:bg-sky-500/10 group-data-[field-state=database]:text-sky-200 group-data-[field-state=empty]:bg-zinc-800 group-data-[field-state=empty]:text-zinc-400 group-data-[field-state=invalid]:bg-red-500/10 group-data-[field-state=invalid]:text-red-200 group-data-[field-state=warning]:bg-orange-500/10 group-data-[field-state=warning]:text-orange-200"
          data-admin-field-status
        />
      </Label>
      <select
        className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        defaultValue={value}
        id={id}
        name="task"
        onChange={(event) => context.setTask(event.currentTarget.value)}
        required
        suppressHydrationWarning
      >
        <option disabled value="">
          Select prompt task
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdminPromptContractForTask({
  children,
  task,
}: {
  children: ReactNode;
  task: string;
}) {
  return usePromptTask().task === task ? children : null;
}

function usePromptTask() {
  const context = useContext(PromptTaskContext);
  if (!context) {
    throw new Error(
      "Prompt task controls must be inside AdminPromptTaskProvider.",
    );
  }
  return context;
}
