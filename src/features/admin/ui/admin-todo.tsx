import { ListTodo, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
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

function getEditHref(filter: TodoFilter, todoId: string) {
  const path = getFilterHref(filter);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}edit=${encodeURIComponent(todoId)}`;
}

export async function AdminTodoPage({
  edit,
  filter,
  message,
  status,
}: {
  edit?: string;
  filter?: string;
  message?: string;
  status?: string;
}) {
  return (
    <AdminGate returnTo="/admin/todo">
      <TodoList
        editId={edit}
        filter={matchFilter(filter)}
        message={message}
        status={status === "success" ? "success" : "error"}
      />
    </AdminGate>
  );
}

async function TodoList({
  editId,
  filter,
  message,
  status,
}: {
  editId?: string;
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
        <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          {todos.map((todo) => (
            <TodoRow
              editing={editId === todo.id}
              filter={filter}
              key={todo.id}
              todo={todo}
            />
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

function TodoRow({
  editing,
  filter,
  todo,
}: {
  editing: boolean;
  filter: TodoFilter;
  todo: AdminMusicTodo;
}) {
  const returnTo = getReturnPath(filter);
  const completed = todo.status === "COMPLETED";
  const startHref =
    completed && todo.contentId
      ? `/admin/content/${encodeURIComponent(todo.contentId)}`
      : `/admin/content/new?todoId=${encodeURIComponent(todo.id)}`;
  const songAndArtist = todo.sourceArtists
    ? `${todo.title} - ${todo.sourceArtists}`
    : todo.title;

  return (
    <article>
      <div className="flex items-start justify-between gap-5 px-4 py-4 sm:px-5">
        <div className="min-w-0 space-y-1.5">
          <h2 className="break-words font-medium text-zinc-100">
            {songAndArtist}
          </h2>
          {todo.from || todo.sourceUrl ? (
            <p className="break-words text-sm text-zinc-400">
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
            </p>
          ) : null}
          {todo.notes ? (
            <p className="max-w-4xl whitespace-pre-wrap text-sm leading-6 text-zinc-500">
              {todo.notes}
            </p>
          ) : (
            <p className="text-sm text-zinc-600">No notes</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-sm">
          <Button asChild size="sm" variant="ghost">
            <Link href={editing ? returnTo : getEditHref(filter, todo.id)}>
              {editing ? "Close" : "Edit"}
            </Link>
          </Button>
          <span className="text-zinc-700">|</span>
          <Button asChild size="sm" variant="ghost">
            <Link href={startHref}>Start</Link>
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="border-t border-zinc-800 bg-zinc-950 p-4 sm:p-5">
          <AdminDirtyForm
            action={updateAdminMusicTodoAction}
            className="grid gap-4"
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
        </div>
      ) : null}
    </article>
  );
}
