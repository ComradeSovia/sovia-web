import {
  AlertCircle,
  Database,
  ListMusic,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMusicWorkAction,
  logoutAdmin,
  saveMusicWorkAction,
} from "../actions";
import { getAdminAuthStatus, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  listAdminMusicWorks,
} from "../data/music-admin";
import { AdminLogin } from "./login-form";

const ADMIN_COPY = {
  status: {
    authDisabledTitle: "admin auth disabled",
    databaseLabel: "content database",
    title: "admin@comrade-sovia",
    description: "postgres overrides / legacy fallback",
    logout: "Logout",
    databaseError: "database error",
    lastActionFailed:
      "The last admin action could not be completed. Try again.",
    connectionReady: "connection ready",
  },
  list: {
    title: "music list",
    description: "search and open existing music overrides",
    searchPlaceholder: "Search title, path, series, YouTube ID",
    addMusic: "Add music",
    edit: "Edit",
    empty: "No music records match this search.",
  },
  form: {
    newWork: "new work",
    editWork: "edit work",
    newWorkDescription: "create a postgres override record",
    editWorkDescription: "update this postgres override record",
    metadataStep: "Metadata",
    platformStep: "Platform",
    contentStep: "Content",
    path: "Path",
    contentId: "Content ID",
    original: "Original",
    youtubeId: "YouTube ID",
    series: "Series",
    description: "Description",
    lyrics: "Lyrics",
    save: "Save",
    deleteOverride: "Delete DB Override",
  },
} as const;

type AdminView = "edit" | "list" | "new";
type AdminMusicWork = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];

function getAdminView(view?: string): AdminView {
  if (view === "edit" || view === "new") return view;
  return "list";
}

function getNormalizedQuery(query?: string) {
  return query?.trim().toLowerCase() ?? "";
}

function matchesMusicSearch(work: AdminMusicWork, query: string) {
  if (!query) return true;

  return [
    work.path,
    work.vid,
    work.title,
    work.original,
    work.u2bId,
    work.series,
    work.shortDescription,
    work.introText,
    work.productionNotes,
    work.lyrics,
  ].some((value) => value?.toLowerCase().includes(query));
}

export async function AdminPage({
  error,
  path,
  query,
  view,
}: {
  error?: string;
  path?: string;
  query?: string;
  view?: string;
}) {
  const authStatus = getAdminAuthStatus();

  if (!authStatus.enabled) {
    return (
      <section className="max-w-2xl py-6">
        <Alert className="border-zinc-700 bg-zinc-900">
          <AlertCircle className="mb-3 h-5 w-5 text-zinc-400" />
          <AlertTitle className="text-zinc-100">
            {ADMIN_COPY.status.authDisabledTitle}
          </AlertTitle>
          <AlertDescription className="text-zinc-400">
            {authStatus.message}
            {authStatus.missing.length > 0
              ? ` Missing: ${authStatus.missing.join(", ")}.`
              : ""}
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminLogin mode={authStatus.mode} />;
  }

  const databaseStatus = await getAdminDatabaseStatus();
  const works = databaseStatus.ok ? await listAdminMusicWorks() : [];
  const adminView = getAdminView(view);
  const normalizedQuery = getNormalizedQuery(query);
  const filteredWorks = works.filter((work) =>
    matchesMusicSearch(work, normalizedQuery),
  );
  const selectedWork =
    adminView === "edit" && path
      ? works.find((work) => work.contentId === path)
      : undefined;
  const shouldShowEditor =
    databaseStatus.ok && (adminView === "new" || adminView === "edit");

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
              <Database className="h-4 w-4" />
              {ADMIN_COPY.status.databaseLabel}
            </div>
            <CardTitle className="font-mono text-3xl">
              {ADMIN_COPY.status.title}
            </CardTitle>
            <CardDescription>{ADMIN_COPY.status.description}</CardDescription>
          </div>

          <form action={logoutAdmin}>
            <Button type="submit" variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              {ADMIN_COPY.status.logout}
            </Button>
          </form>
        </CardHeader>
      </Card>

      {!databaseStatus.ok && (
        <Alert className="border-zinc-700 bg-zinc-900">
          <AlertCircle className="mb-3 h-5 w-5 text-zinc-400" />
          <AlertTitle className="text-zinc-100">
            {ADMIN_COPY.status.databaseError}
          </AlertTitle>
          <AlertDescription className="text-zinc-400">
            <p>Database is not fully available.</p>
            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs font-medium text-zinc-200">
                Show details
              </summary>
              <div className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400">
                {databaseStatus.message}
              </div>
            </details>
          </AlertDescription>
        </Alert>
      )}

      {error === "database" && databaseStatus.ok && (
        <Alert className="border-zinc-700 bg-zinc-900">
          <AlertCircle className="mb-3 h-5 w-5 text-zinc-400" />
          <AlertTitle className="text-zinc-100">
            {ADMIN_COPY.status.databaseError}
          </AlertTitle>
          <AlertDescription className="text-zinc-400">
            {ADMIN_COPY.status.lastActionFailed}
          </AlertDescription>
        </Alert>
      )}

      {databaseStatus.ok ? (
        <Alert>
          <AlertTitle>{ADMIN_COPY.status.connectionReady}</AlertTitle>
          <AlertDescription>{databaseStatus.message}</AlertDescription>
        </Alert>
      ) : null}

      {databaseStatus.ok && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(32rem,1.35fr)]">
          <MusicListPanel
            query={query}
            selectedPath={selectedWork?.contentId}
            works={filteredWorks}
          />

          {shouldShowEditor ? (
            <MusicStepper work={selectedWork} view={adminView} />
          ) : (
            <Card className="hidden min-h-96 place-items-center border-dashed xl:grid">
              <CardContent className="pt-5 text-center">
                <ListMusic className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
                <CardTitle>{ADMIN_COPY.list.title}</CardTitle>
                <CardDescription className="mt-2">
                  Select a record to edit, or start a new music entry.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

function MusicListPanel({
  query,
  selectedPath,
  works,
}: {
  query?: string;
  selectedPath?: string;
  works: AdminMusicWork[];
}) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
              <ListMusic className="h-4 w-4" />
              {works.length} records
            </div>
            <CardTitle>{ADMIN_COPY.list.title}</CardTitle>
            <CardDescription>{ADMIN_COPY.list.description}</CardDescription>
          </div>

          <Button asChild>
            <Link href="/admin?view=new">
              <Plus className="mr-2 h-4 w-4" />
              {ADMIN_COPY.list.addMusic}
            </Link>
          </Button>
        </div>

        <form action="/admin" className="grid gap-2">
          <input name="view" type="hidden" value="list" />
          <Label htmlFor="admin-music-search">Search</Label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              defaultValue={query ?? ""}
              id="admin-music-search"
              name="q"
              placeholder={ADMIN_COPY.list.searchPlaceholder}
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardHeader>

      <CardContent>
        {works.length ? (
          <div className="divide-y divide-zinc-800 border border-zinc-800">
            {works.map((work) => (
              <a
                key={work.contentId}
                href={`/admin?view=edit&path=${encodeURIComponent(work.contentId)}`}
                className={`grid gap-2 px-4 py-3 transition hover:bg-zinc-900 ${
                  selectedPath === work.contentId ? "bg-zinc-900" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-zinc-100">
                      {work.title}
                    </div>
                    <div className="mt-1 truncate text-xs text-zinc-500">
                      {work.series || work.original || "No series"}
                    </div>
                  </div>
                  <Pencil className="mt-1 h-4 w-4 shrink-0 text-zinc-500" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{work.path}</Badge>
                  {work.u2bId ? (
                    <Badge variant="outline">{work.u2bId}</Badge>
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500">
            {ADMIN_COPY.list.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MusicStepper({
  view,
  work,
}: {
  view: AdminView;
  work?: AdminMusicWork;
}) {
  const isEdit = view === "edit";

  return (
    <Card>
      <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <CardTitle>
            {isEdit ? ADMIN_COPY.form.editWork : ADMIN_COPY.form.newWork}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? ADMIN_COPY.form.editWorkDescription
              : ADMIN_COPY.form.newWorkDescription}
          </CardDescription>
        </div>

        {work ? (
          <form action={deleteMusicWorkAction}>
            <input name="contentId" type="hidden" value={work.contentId} />
            <input name="path" type="hidden" value={work.path} />
            <Button type="submit" variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {ADMIN_COPY.form.deleteOverride}
            </Button>
          </form>
        ) : null}
      </CardHeader>

      <CardContent>
        {isEdit && !work ? (
          <Alert className="border-zinc-700 bg-zinc-900">
            <AlertCircle className="mb-3 h-5 w-5 text-zinc-400" />
            <AlertTitle className="text-zinc-100">record not found</AlertTitle>
            <AlertDescription className="text-zinc-400">
              Return to the music list and choose an existing record.
            </AlertDescription>
          </Alert>
        ) : (
          <MusicWorkForm work={work} />
        )}
      </CardContent>
    </Card>
  );
}

function Step({
  children,
  description,
  step,
  title,
}: {
  children: ReactNode;
  description: string;
  step: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[8rem_minmax(0,1fr)]">
      <div>
        <div className="grid h-9 w-9 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-sm font-black text-zinc-100">
          {step}
        </div>
        <div className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
          {title}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>

      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function MusicWorkForm({ work }: { work?: AdminMusicWork }) {
  return (
    <form action={saveMusicWorkAction} className="grid gap-5">
      {work && (
        <input name="currentContentId" type="hidden" value={work.contentId} />
      )}

      <Step
        description="Set the URL slug and archive metadata."
        step="1"
        title={ADMIN_COPY.form.metadataStep}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={ADMIN_COPY.form.path}
            name="path"
            required
            value={work?.path}
          />
          <Field
            label={ADMIN_COPY.form.contentId}
            name="vid"
            value={work?.vid}
          />
          <Field
            label={ADMIN_COPY.form.series}
            name="series"
            value={work?.series}
          />
        </div>
      </Step>

      <Step
        description="Connect the archive record to source and platform IDs."
        step="2"
        title={ADMIN_COPY.form.platformStep}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={ADMIN_COPY.form.original}
            name="original"
            value={work?.original}
          />
          <Field
            label={ADMIN_COPY.form.youtubeId}
            name="u2bId"
            value={work?.u2bId}
          />
        </div>
      </Step>

      <Step
        description="Write the public description and lyrics payload."
        step="3"
        title={ADMIN_COPY.form.contentStep}
      >
        <Field
          label="Short description"
          name="shortDescription"
          value={work?.shortDescription}
        />
        <TextArea label="Intro text" name="introText" value={work?.introText} />
        <TextArea
          label="Production notes"
          name="productionNotes"
          value={work?.productionNotes}
        />
        <TextArea
          label={ADMIN_COPY.form.lyrics}
          name="lyrics"
          value={work?.lyrics}
          rows={14}
        />
      </Step>

      <div>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          {ADMIN_COPY.form.save}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  value,
}: {
  label: string;
  name: string;
  required?: boolean;
  value?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input defaultValue={value ?? ""} name={name} required={required} />
    </div>
  );
}

function TextArea({
  label,
  name,
  rows = 8,
  value,
}: {
  label: string;
  name: string;
  rows?: number;
  value?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Textarea defaultValue={value ?? ""} name={name} rows={rows} />
    </div>
  );
}
