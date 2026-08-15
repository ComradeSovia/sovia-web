import { ListTodo, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AdminMusicTodoStatus,
  listAdminMusicTodos,
} from "../data/music-todos";
import { AdminActionToast } from "./admin-action-toast";
import { AdminGate } from "./admin-content";

const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";
const PRIMARY_BUTTON_CLASS =
  "border-zinc-950 bg-zinc-950 text-white shadow-none hover:bg-zinc-800";
const STATUS_OPTIONS = [
  { label: "Proposed", value: "PROPOSED" },
  { label: "Planning", value: "PLANNING" },
  { label: "Completed", value: "COMPLETED" },
] as const;

type TodoFilter = AdminMusicTodoStatus | "ALL";
type AdminMusicTodo = Awaited<ReturnType<typeof listAdminMusicTodos>>[number];

function matchFilter(value?: string): TodoFilter {
  return value === "PROPOSED" || value === "PLANNING" || value === "COMPLETED"
    ? value
    : "ALL";
}

function getFilterHref(filter: TodoFilter) {
  return filter === "ALL" ? "/admin/todo" : `/admin/todo?filter=${filter}`;
}

function getActionHref(
  filter: TodoFilter,
  action: string,
  values: Record<string, string> = {},
) {
  const path = getFilterHref(filter);
  const separator = path.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ action, ...values });
  return `${path}${separator}${params.toString()}`;
}

export async function AdminTodoPage({
  filter,
  message,
  status,
}: {
  filter?: string;
  message?: string;
  status?: string;
}) {
  return (
    <AdminGate returnTo="/admin/todo">
      <TodoList
        filter={matchFilter(filter)}
        message={message}
        status={status === "success" ? "success" : "error"}
      />
    </AdminGate>
  );
}

async function TodoList({
  filter,
  message,
  status,
}: {
  filter: TodoFilter;
  message?: string;
  status: "error" | "success";
}) {
  const allTodos = await listAdminMusicTodos();
  const todos =
    filter === "ALL"
      ? allTodos
      : allTodos.filter((todo) => todo.status === filter);
  const counts = Object.fromEntries(
    STATUS_OPTIONS.map((option) => [
      option.value,
      allTodos.filter((todo) => todo.status === option.value).length,
    ]),
  ) as Record<AdminMusicTodoStatus, number>;
  return (
    <section className="space-y-5">
      <AdminActionToast message={message} status={status} />

      <Card className={CARD_CLASS}>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <ListTodo className="h-4 w-4" />
            music planning
          </div>
          <CardTitle className="text-3xl text-zinc-100">Todo</CardTitle>
          <CardDescription className="text-zinc-400">
            Add ideas from Actions, move them into planning, then create Content
            when they are ready. AI can analyze audience feedback into multiple
            proposals.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={filter === "ALL" ? "default" : "outline"}>
            <Link href={getFilterHref("ALL")}>All {allTodos.length}</Link>
          </Button>
          {STATUS_OPTIONS.map((option) => (
            <Button
              asChild
              key={option.value}
              variant={filter === option.value ? "default" : "outline"}
            >
              <Link href={getFilterHref(option.value)}>
                {option.label} {counts[option.value]}
              </Link>
            </Button>
          ))}
        </div>
        <Button asChild className={PRIMARY_BUTTON_CLASS}>
          <Link href={getActionHref(filter, "todo.create")}>
            <Plus className="size-4" />
            Add Todo
          </Link>
        </Button>
      </div>

      {todos.length ? (
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Todo</TableHead>
                <TableHead className="w-24 text-zinc-400">Visibility</TableHead>
                <TableHead className="w-40 text-right text-zinc-400">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todos.map((todo) => (
                <TodoRow filter={filter} key={todo.id} todo={todo} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-400">
          No Todo items in this view.
        </div>
      )}
    </section>
  );
}

function TodoRow({
  filter,
  todo,
}: {
  filter: TodoFilter;
  todo: AdminMusicTodo;
}) {
  const hasContent = Boolean(todo.contentId);
  const songAndArtist = todo.sourceArtists
    ? `${todo.title} - ${todo.sourceArtists}`
    : todo.title;

  return (
    <TableRow className="border-zinc-800 hover:bg-zinc-800/30">
      <TableCell className="min-w-0 whitespace-normal py-3 align-top">
        <div className="min-w-0 space-y-1">
          <div className="break-words text-sm font-medium text-zinc-100">
            {songAndArtist}
          </div>
          {todo.from || todo.sourceUrl ? (
            <div className="break-words text-xs text-zinc-400">
              {todo.sourceUrl ? (
                <a
                  className="underline decoration-zinc-600 underline-offset-4 hover:text-zinc-200"
                  href={todo.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {todo.from || "Reference link"}
                </a>
              ) : (
                todo.from
              )}
            </div>
          ) : null}
          {todo.notes ? (
            <div className="max-w-4xl whitespace-pre-wrap text-xs leading-5 text-zinc-500">
              {todo.notes}
            </div>
          ) : (
            <div className="text-xs text-zinc-600">No notes</div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3 align-top">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
            todo.visible
              ? "border-emerald-700/70 bg-emerald-950/30 text-emerald-300"
              : "border-zinc-700 text-zinc-500"
          }`}
        >
          {todo.visible ? "Visible" : "Hidden"}
        </span>
      </TableCell>
      <TableCell className="py-3 text-right align-top">
        <div className="inline-flex items-center gap-1 text-sm">
          <Button asChild size="sm" variant="ghost">
            <Link href={getActionHref(filter, "todo.edit", { todo: todo.id })}>
              Edit
            </Link>
          </Button>
          <span className="text-zinc-700">|</span>
          <Button asChild size="sm" variant="ghost">
            <Link
              href={
                hasContent && todo.contentId
                  ? `/admin/content/${encodeURIComponent(todo.contentId)}`
                  : getActionHref(filter, "todo.start", { todo: todo.id })
              }
            >
              {hasContent ? "Open" : "Start"}
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
