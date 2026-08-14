import {
  CheckCircle2,
  CircleDot,
  Flame,
  ListTodo,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type AdminMusicTodoStatus,
  listAdminMusicTodos,
} from "../data/music-todos";
import {
  deleteAdminMusicTodoAction,
  returnAdminMusicTodoToPlanningAction,
  updateAdminMusicTodoAction,
} from "../todo-actions";
import { AdminActionToast } from "./admin-action-toast";
import {
  AdminGate,
  Field,
  FieldStateGuide,
  SelectField,
  TextArea,
} from "./admin-content";
import { AdminConfirmForm, AdminDirtyForm } from "./admin-step-panels";

const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";
const PRIMARY_BUTTON_CLASS =
  "border-zinc-950 bg-zinc-950 text-white shadow-none hover:bg-zinc-800";
const SECONDARY_BUTTON_CLASS =
  "border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700";
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

function getReturnPath(filter: TodoFilter) {
  return getFilterHref(filter);
}

function getActionHref(filter: TodoFilter, action: string) {
  const path = getFilterHref(filter);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}action=${encodeURIComponent(action)}`;
}

function getStatusLabel(status: AdminMusicTodoStatus) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
  );
}

function getStatusIcon(status: AdminMusicTodoStatus) {
  if (status === "COMPLETED") return CheckCircle2;
  if (status === "PLANNING") return Wrench;
  return CircleDot;
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
        <div className="grid gap-4">
          {todos.map((todo) => (
            <TodoCard filter={filter} key={todo.id} todo={todo} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-400">
          No Todo items in this view.
        </div>
      )}
    </section>
  );
}

function TodoCard({
  filter,
  todo,
}: {
  filter: TodoFilter;
  todo: AdminMusicTodo;
}) {
  const StatusIcon = getStatusIcon(todo.status);
  const returnTo = getReturnPath(filter);
  const completed = todo.status === "COMPLETED";

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-200">
              <StatusIcon className="mr-1 h-3.5 w-3.5" />
              {getStatusLabel(todo.status)}
            </Badge>
            <Badge
              className="border-zinc-700 bg-transparent text-zinc-400"
              variant="outline"
            >
              <Flame className="mr-1 h-3.5 w-3.5" />
              {todo.heatScore.toFixed(1)} · {todo.voteCount} votes
            </Badge>
          </div>
          <CardTitle className="break-words text-xl text-zinc-100">
            {todo.title}
          </CardTitle>
          <CardDescription className="mt-2 text-zinc-400">
            {[todo.from, todo.sourceArtists].filter(Boolean).join(" · ") ||
              "No source details"}
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {completed && todo.contentId ? (
            <Button asChild className={PRIMARY_BUTTON_CLASS}>
              <Link
                href={`/admin/content/${encodeURIComponent(todo.contentId)}`}
              >
                Open Content · {todo.contentId}
              </Link>
            </Button>
          ) : (
            <Button asChild className={PRIMARY_BUTTON_CLASS}>
              <Link
                href={`/admin/content/new?todoId=${encodeURIComponent(todo.id)}`}
              >
                Create Content
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <details className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-200">
            Edit details
          </summary>
          <AdminDirtyForm
            action={updateAdminMusicTodoAction}
            className="mt-4 grid gap-4"
          >
            <input name="returnTo" type="hidden" value={returnTo} />
            <input name="todoId" type="hidden" value={todo.id} />
            <FieldStateGuide />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Song title"
                name="title"
                placeholder="Song you want to adapt"
                required
                value={todo.title}
              />
              <SelectField
                label="Status"
                name="todoStatus"
                options={
                  completed ? [STATUS_OPTIONS[2]] : STATUS_OPTIONS.slice(0, 2)
                }
                value={todo.status}
              />
              <Field
                label="From"
                name="from"
                placeholder="Work this song comes from"
                value={todo.from}
              />
              <Field
                label="Source artists"
                name="sourceArtists"
                placeholder="Original artist or author"
                value={todo.sourceArtists}
              />
              <Field
                label="Source URL"
                name="sourceUrl"
                placeholder="YouTube, Spotify, or Apple Music URL"
                type="url"
                value={todo.sourceUrl}
              />
              <TextArea
                label="Notes"
                name="notes"
                placeholder="Adaptation ideas and direction"
                rows={4}
                value={todo.notes}
              />
            </div>
            <div className="flex justify-end">
              <Button className={PRIMARY_BUTTON_CLASS} type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Todo
              </Button>
            </div>
          </AdminDirtyForm>
          <div className="mt-3 flex flex-wrap gap-2">
            {completed ? (
              <AdminConfirmForm
                action={returnAdminMusicTodoToPlanningAction}
                confirmLabel="Return to planning"
                message="Return this Todo to planning and remove its Content link? The Content itself will not be deleted."
              >
                <input name="returnTo" type="hidden" value={returnTo} />
                <input name="todoId" type="hidden" value={todo.id} />
                <Button
                  className={SECONDARY_BUTTON_CLASS}
                  type="submit"
                  variant="outline"
                >
                  Return to planning
                </Button>
              </AdminConfirmForm>
            ) : (
              <AdminConfirmForm
                action={deleteAdminMusicTodoAction}
                confirmLabel="Delete Todo"
                message="Delete this Todo? This cannot be undone."
              >
                <input name="returnTo" type="hidden" value={returnTo} />
                <input name="todoId" type="hidden" value={todo.id} />
                <Button type="submit" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AdminConfirmForm>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
