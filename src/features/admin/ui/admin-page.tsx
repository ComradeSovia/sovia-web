import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@sovia/shared/ui/shadcn/alert";
import { Badge } from "@sovia/shared/ui/shadcn/badge";
import { Button } from "@sovia/shared/ui/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@sovia/shared/ui/shadcn/card";
import { Input } from "@sovia/shared/ui/shadcn/input";
import { Label } from "@sovia/shared/ui/shadcn/label";
import { Textarea } from "@sovia/shared/ui/shadcn/textarea";
import { AlertCircle, Database, LogOut, Save, Trash2 } from "lucide-react";
import {
  deleteMusicWorkAction,
  logoutAdmin,
  saveMusicWorkAction,
} from "../actions";
import { hasAdminPassword, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  listAdminMusicWorks,
} from "../data/music-admin";
import type { AdminCopy } from "../i18n/copy";
import { AdminLogin } from "./login-form";

export async function AdminPage({
  copy,
  error,
}: {
  copy: AdminCopy;
  error?: string;
}) {
  if (!hasAdminPassword()) {
    return (
      <section className="mx-auto max-w-2xl py-12">
        <Alert className="border-red-500/50 bg-red-950/40">
          <AlertCircle className="mb-3 h-5 w-5 text-red-300" />
          <AlertTitle className="text-red-200">
            {copy.status.missingPasswordTitle}
          </AlertTitle>
          <AlertDescription className="text-red-200/80">
            {copy.status.missingPasswordDescription}
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminLogin copy={copy} />;
  }

  const databaseStatus = await getAdminDatabaseStatus();
  const works = databaseStatus.ok ? await listAdminMusicWorks() : [];

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-emerald-500">
              <Database className="h-4 w-4" />
              {copy.status.databaseLabel}
            </div>
            <CardTitle className="font-mono text-3xl">
              {copy.status.title}
            </CardTitle>
            <CardDescription>{copy.status.description}</CardDescription>
          </div>

          <form action={logoutAdmin}>
            <Button type="submit" variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              {copy.status.logout}
            </Button>
          </form>
        </CardHeader>
      </Card>

      {!databaseStatus.ok && (
        <Alert className="border-red-500/50 bg-red-950/40">
          <AlertCircle className="mb-3 h-5 w-5 text-red-300" />
          <AlertTitle className="text-red-200">
            {copy.status.databaseError}
          </AlertTitle>
          <AlertDescription className="text-red-200/80">
            {databaseStatus.message}
          </AlertDescription>
        </Alert>
      )}

      {error === "database" && databaseStatus.ok && (
        <Alert className="border-red-500/50 bg-red-950/40">
          <AlertCircle className="mb-3 h-5 w-5 text-red-300" />
          <AlertTitle className="text-red-200">
            {copy.status.databaseError}
          </AlertTitle>
          <AlertDescription className="text-red-200/80">
            {copy.status.lastActionFailed}
          </AlertDescription>
        </Alert>
      )}

      {databaseStatus.ok ? (
        <Alert>
          <AlertTitle>{copy.status.connectionReady}</AlertTitle>
          <AlertDescription>{databaseStatus.message}</AlertDescription>
        </Alert>
      ) : null}

      {databaseStatus.ok && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{copy.form.newWork}</CardTitle>
              <CardDescription>{copy.form.newWorkDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <MusicWorkForm copy={copy} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {works.map((work) => (
              <details
                key={work.path}
                className="rounded-lg border border-emerald-500/30 bg-zinc-950/95 p-5 text-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.12)]"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-emerald-200">
                      {work.title}
                    </span>
                    <Badge variant="outline">{work.path}</Badge>
                  </div>
                </summary>
                <div className="mt-5 space-y-5">
                  <MusicWorkForm copy={copy} work={work} />
                  <form action={deleteMusicWorkAction}>
                    <input name="path" type="hidden" value={work.path} />
                    <Button type="submit" variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {copy.form.deleteOverride}
                    </Button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

type MusicWorkFormProps = {
  copy: AdminCopy;
  work?: {
    path: string;
    vid: string;
    title: string;
    original?: string | null;
    u2bId?: string | null;
    series?: string | null;
    description?: string | null;
    lyrics?: string | null;
  };
};

function MusicWorkForm({ copy, work }: MusicWorkFormProps) {
  return (
    <form action={saveMusicWorkAction} className="grid gap-4">
      {work && <input name="currentPath" type="hidden" value={work.path} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={copy.form.path} name="path" required value={work?.path} />
        <Field label={copy.form.contentId} name="vid" value={work?.vid} />
        <Field
          label={copy.form.title}
          name="title"
          required
          value={work?.title}
        />
        <Field
          label={copy.form.original}
          name="original"
          value={work?.original}
        />
        <Field label={copy.form.youtubeId} name="u2bId" value={work?.u2bId} />
        <Field label={copy.form.series} name="series" value={work?.series} />
      </div>

      <TextArea
        label={copy.form.description}
        name="description"
        value={work?.description}
      />
      <TextArea
        label={copy.form.lyrics}
        name="lyrics"
        value={work?.lyrics}
        rows={14}
      />

      <div>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          {copy.form.save}
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
