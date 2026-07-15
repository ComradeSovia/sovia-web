import {
  SITE_LOCALE_LABELS,
  SITE_LOCALES,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
import type { YoutubeLocalizationContent } from "@sovia/sound/model/music";
import {
  checkYouTubeVideoPublished,
  type YouTubePublicationStatus,
} from "@sovia/youtube-api";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Database,
  LayoutDashboard,
  ListMusic,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Video,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { deleteMusicWorkAction, saveMusicWorkStepAction } from "../actions";
import { getAdminAuthStatus, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  listAdminMusicWorks,
} from "../data/music-admin";
import { AdminActionToast } from "./admin-action-toast";
import {
  type AdminEditorStep,
  matchAdminEditorStep,
} from "./admin-editor-steps";
import { AdminLocalePanels } from "./admin-locale-panels";
import { AdminDirtyForm } from "./admin-step-panels";
import { AdminLogin } from "./login-form";

type AdminMusicWork = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];

const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";
const CARD_TITLE_CLASS = "text-zinc-100";
const CARD_DESCRIPTION_CLASS = "text-zinc-400";
const PRIMARY_BUTTON_CLASS =
  "border-zinc-950 bg-zinc-950 text-white shadow-none hover:bg-zinc-800";
const SECONDARY_BUTTON_CLASS =
  "border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700";
const WORK_TYPE_OPTIONS = [
  { label: "[O] Original", value: "O" },
  { label: "[CO] Concept Original", value: "CO" },
  { label: "[R] Reimagining", value: "R" },
  { label: "[LC] Lyric Rework Cover", value: "LC" },
  { label: "[C] Faithful Cover", value: "C" },
] as const;
const FROM_TYPE_OPTIONS = ["Original", "Anime", "Game", "Pop", "Meme"] as const;

async function AdminGate({ children }: { children: ReactNode }) {
  const authStatus = getAdminAuthStatus();

  if (!authStatus.enabled) {
    return (
      <Alert className="border-zinc-700 bg-zinc-900 text-zinc-100">
        <AlertCircle className="mb-3 h-5 w-5 text-zinc-400" />
        <AlertTitle className="text-zinc-100">admin auth disabled</AlertTitle>
        <AlertDescription className="text-zinc-400">
          {authStatus.message}
          {authStatus.missing.length > 0
            ? ` Missing: ${authStatus.missing.join(", ")}.`
            : ""}
        </AlertDescription>
      </Alert>
    );
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminLogin mode={authStatus.mode} />;
  }

  return <>{children}</>;
}

function DatabaseError({
  message,
  summary = "A database problem was detected. You can keep browsing available local content, but database writes may fail.",
  title = "database error",
}: {
  message: string;
  summary?: string;
  title?: string;
}) {
  return (
    <Alert className="border-zinc-700 bg-zinc-900 text-zinc-100">
      <AlertCircle className="mb-3 h-5 w-5 text-zinc-400" />
      <AlertTitle className="text-zinc-100">{title}</AlertTitle>
      <AlertDescription className="text-zinc-400">
        <p>{summary}</p>
        <details className="mt-3">
          <summary className="cursor-pointer select-none text-xs font-medium text-zinc-200">
            Show details
          </summary>
          <div className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400">
            {message}
          </div>
        </details>
      </AlertDescription>
    </Alert>
  );
}

export async function AdminDashboardPage() {
  return (
    <AdminGate>
      <section className="space-y-5">
        <Card className={CARD_CLASS}>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <LayoutDashboard className="h-4 w-4" />
              overview
            </div>
            <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
              Dashboard
            </CardTitle>
            <CardDescription className={CARD_DESCRIPTION_CLASS}>
              Content operations overview
            </CardDescription>
          </CardHeader>
        </Card>
        <DashboardStatus />
      </section>
    </AdminGate>
  );
}

async function DashboardStatus() {
  const databaseStatus = await getAdminDatabaseStatus();
  const works = await listAdminMusicWorks();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className={CARD_CLASS}>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Database className="h-4 w-4" />
            database
          </div>
          <CardTitle className={CARD_TITLE_CLASS}>
            {databaseStatus.ok ? "Ready" : "Offline"}
          </CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            {databaseStatus.message}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className={CARD_TITLE_CLASS}>{works.length}</CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            content records
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className={CARD_TITLE_CLASS}>Music</CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            primary content type
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export async function AdminContentListPage({
  error,
  message,
  query,
}: {
  error?: string;
  message?: string;
  query?: string;
}) {
  return (
    <AdminGate>
      <ContentList error={error} message={message} query={query} />
    </AdminGate>
  );
}

async function ContentList({
  error,
  message,
  query,
}: {
  error?: string;
  message?: string;
  query?: string;
}) {
  const databaseStatus = await getAdminDatabaseStatus();

  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const works = (await listAdminMusicWorks()).filter((work) =>
    [
      work.path,
      work.contentId,
      work.storageSource,
      work.visible ? "visible" : "hidden",
      work.publishedAt,
      work.songTitle,
      work.fromTitle,
      work.fromArtists?.join(", "),
      work.fromSource,
      work.fromType,
      work.fromIp,
      work.fromSeries,
      work.fromSession,
      work.fromDetails,
      work.u2bId,
      work.vkId,
      work.vkTitle,
      work.vkDescription,
      work.bilibiliId,
      work.bilibiliTitle,
      work.bilibiliDescription,
      work.pixivId,
      work.pixivTitle,
      work.pixivDescription,
      work.shortDescription,
      work.introText,
      work.productionNotes,
      work.lyrics,
      ...Object.values(work.youtubeLocalization ?? {}).flatMap((content) => [
        content?.title,
        content?.description,
      ]),
      ...Object.values(work.subtitleTracks ?? {}),
    ].some((value) => value?.toLowerCase().includes(normalizedQuery)),
  );

  return (
    <section className="space-y-5">
      <AdminActionToast
        message={
          message ?? (error === "database" ? "Database error." : undefined)
        }
      />

      {error === "database" ? (
        <DatabaseError
          message="The last admin action could not be completed. Try again."
          summary="The last admin action could not be completed."
        />
      ) : null}

      {!databaseStatus.ok ? (
        <DatabaseError
          message={`${databaseStatus.message}\n\nShowing available file-backed content so the admin UI can keep rendering during local development. Database writes may still fail until migrations are applied.`}
          summary="Database is not fully available. Showing file-backed content for local development."
          title="database warning"
        />
      ) : null}

      <Card className={CARD_CLASS}>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
                <ListMusic className="h-4 w-4" />
                content management
              </div>
              <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
                Content
              </CardTitle>
              <CardDescription className={CARD_DESCRIPTION_CLASS}>
                Search, filter, and open music content records
              </CardDescription>
            </div>
            <Button asChild className={PRIMARY_BUTTON_CLASS}>
              <Link href="/admin/content/new">
                <Plus className="mr-2 h-4 w-4" />
                Add music
              </Link>
            </Button>
          </div>

          <form action="/admin/content" className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="admin-content-search">Search</Label>
                <Input
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
                  defaultValue={query ?? ""}
                  id="admin-content-search"
                  name="q"
                  placeholder="Search title, path, series, YouTube ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-content-type">Category</Label>
                <Select defaultValue="music" name="type">
                  <SelectTrigger className="w-full" id="admin-content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music">Music</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className={SECONDARY_BUTTON_CLASS}
                type="submit"
                variant="outline"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </form>
        </CardHeader>
        <CardContent>
          <ContentTable works={works} />
        </CardContent>
      </Card>
    </section>
  );
}

function ContentTable({ works }: { works: AdminMusicWork[] }) {
  if (!works.length) {
    return (
      <div className="rounded-md border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400">
        No content records match this search.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-72">Title</TableHead>
            <TableHead className="min-w-40">UID</TableHead>
            <TableHead className="min-w-32">Source</TableHead>
            <TableHead className="min-w-48">YouTube</TableHead>
            <TableHead className="min-w-48">Subtitles</TableHead>
            <TableHead className="min-w-48">Distribution</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {works.map((work) => (
            <TableRow key={work.contentId}>
              <TableCell className="min-w-0">
                <Link
                  href={`/admin/content/${encodeURIComponent(work.contentId)}`}
                  className="block min-w-0"
                >
                  <div className="truncate font-medium">
                    {work.songTitle || "empty"}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {work.fromTitle ||
                      work.fromDetails ||
                      work.fromSeries ||
                      work.fromType ||
                      "No source"}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {work.contentId}
              </TableCell>
              <TableCell>
                <StorageSourceBadge source={work.storageSource} />
              </TableCell>
              <TableCell>
                <YoutubeLocalizationBadges work={work} />
              </TableCell>
              <TableCell>
                <SubtitleBadges work={work} />
              </TableCell>
              <TableCell>
                <PlatformBadges work={work} />
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="ghost">
                  <Link
                    href={`/admin/content/${encodeURIComponent(work.contentId)}`}
                  >
                    <Pencil />
                    Edit
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
        <span>Page 1</span>
        <span>{works.length} shown</span>
      </div>
    </div>
  );
}

function StorageSourceBadge({
  source,
}: {
  source?: AdminMusicWork["storageSource"];
}) {
  const label =
    source === "db+file" ? "DB + file" : source === "db" ? "DB" : "File";
  const className =
    source === "db+file"
      ? "border-amber-700 bg-amber-950 text-amber-100"
      : source === "db"
        ? "border-emerald-700 bg-emerald-950 text-emerald-100"
        : "border-zinc-700 bg-transparent text-zinc-400";

  return (
    <Badge className={className} variant="outline">
      {label}
    </Badge>
  );
}

function YoutubeLocalizationBadges({ work }: { work: AdminMusicWork }) {
  const languages = Object.keys(work.youtubeLocalization ?? {});

  if (!languages.length) {
    return (
      <Badge
        className="border-zinc-700 bg-transparent text-zinc-400"
        variant="outline"
      >
        empty
      </Badge>
    );
  }

  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {languages.map((locale) => (
        <Badge
          className="border-zinc-700 bg-zinc-800 text-zinc-100"
          key={locale}
        >
          {locale}
        </Badge>
      ))}
    </div>
  );
}

function SubtitleBadges({ work }: { work: AdminMusicWork }) {
  const languages = Object.keys(work.subtitleTracks ?? {});

  if (!languages.length) {
    return (
      <Badge
        className="border-zinc-700 bg-transparent text-zinc-400"
        variant="outline"
      >
        empty
      </Badge>
    );
  }

  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {languages.map((locale) => (
        <Badge
          className="border-zinc-700 bg-zinc-800 text-zinc-100"
          key={locale}
        >
          {locale}
        </Badge>
      ))}
    </div>
  );
}

function PlatformBadges({ work }: { work: AdminMusicWork }) {
  const platforms = [
    work.u2bId ? "YouTube" : null,
    work.bilibiliId ? "Bilibili" : null,
    work.vkId ? "VK" : null,
    work.pixivId ? "Pixiv" : null,
  ].filter(Boolean);

  if (!platforms.length) {
    return <span className="text-xs text-zinc-500">No platform IDs</span>;
  }

  return (
    <div className="flex max-w-60 flex-wrap gap-1">
      {platforms.map((platform) => (
        <Badge
          className="border-zinc-700 bg-transparent text-zinc-300"
          key={platform}
          variant="outline"
        >
          {platform}
        </Badge>
      ))}
    </div>
  );
}

export async function AdminContentEditorPage({
  id,
  message,
  step,
}: {
  id?: string;
  message?: string;
  step?: string;
}) {
  return (
    <AdminGate>
      <ContentEditor
        id={id}
        message={message}
        step={matchAdminEditorStep(step)}
      />
    </AdminGate>
  );
}

async function ContentEditor({
  id,
  message,
  step,
}: {
  id?: string;
  message?: string;
  step: AdminEditorStep;
}) {
  const databaseStatus = await getAdminDatabaseStatus();

  const works = await listAdminMusicWorks();
  const work = id ? works.find((item) => item.contentId === id) : undefined;
  const youtubePublicationStatus = await checkYouTubeVideoPublished(
    work?.u2bId,
  );

  return (
    <section className="space-y-5">
      <AdminActionToast message={message} />

      {!databaseStatus.ok ? (
        <DatabaseError
          message={`${databaseStatus.message}\n\nThe editor is rendering with available file-backed content. Saving database changes may still fail until migrations are applied.`}
          summary="Database is not fully available. The editor is rendering with available file-backed content."
          title="database warning"
        />
      ) : null}

      <Card className={CARD_CLASS}>
        <CardHeader className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
                <Video className="h-4 w-4 text-zinc-500" />
                content editor
              </div>
              <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
                {work?.songTitle || work?.contentId || "New music content"}
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CardDescription className={CARD_DESCRIPTION_CLASS}>
                  {work ? (
                    <>
                      <span className="font-mono">{work.contentId}</span>
                      {" / "}
                      <span className="font-mono">{work.path}</span>
                    </>
                  ) : (
                    "Create a structured music content record."
                  )}
                </CardDescription>
                {work ? (
                  <StorageSourceBadge source={work.storageSource} />
                ) : null}
              </div>
            </div>
            {work ? (
              <form action={deleteMusicWorkAction}>
                <input name="contentId" type="hidden" value={work.contentId} />
                <input name="path" type="hidden" value={work.path} />
                <Button
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700"
                  type="submit"
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete DB Override
                </Button>
              </form>
            ) : null}
          </div>
          <ContentReviewHeader work={work} />
        </CardHeader>
        <CardContent>
          {id && !work ? (
            <DatabaseError
              message="Content record was not found."
              summary="Content record was not found."
            />
          ) : (
            <MusicWorkForm
              currentStep={step}
              work={work}
              youtubePublicationStatus={youtubePublicationStatus}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Section({
  children,
  id,
  index,
  title,
}: {
  children: ReactNode;
  id: string;
  index: number;
  title: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-5 rounded-md border border-zinc-800 bg-zinc-950 p-4"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
          {index}
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function StepForm({
  children,
  step,
  work,
}: {
  children: ReactNode;
  step:
    | "metadata"
    | "status"
    | "from"
    | "description"
    | "lyrics"
    | "related"
    | "youtube"
    | "bilibili"
    | "vk"
    | "pixiv"
    | "subtitles";
  work?: AdminMusicWork;
}) {
  return (
    <AdminDirtyForm
      action={saveMusicWorkStepAction}
      className="grid gap-5"
      key={step}
    >
      <input name="adminStep" type="hidden" value={step} />
      {work ? (
        <input name="currentContentId" type="hidden" value={work.contentId} />
      ) : null}
      {children}
    </AdminDirtyForm>
  );
}

function StepSaveButton({ label }: { label: string }) {
  return (
    <div className="flex justify-end">
      <Button className={PRIMARY_BUTTON_CLASS} type="submit">
        <Save className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}

function getTextRows(value: string | null | undefined, minimumRows: number) {
  const lineCount = value ? value.split(/\r\n|\r|\n/).length : 0;
  return Math.max(minimumRows, lineCount + 2);
}

function ContentReviewHeader({ work }: { work?: AdminMusicWork }) {
  const subtitleTrackCount = Object.keys(work?.subtitleTracks ?? {}).length;
  const distributionReview = getDistributionReview(work);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <ReviewItem
        complete={Boolean(work?.contentId && work?.path && work?.workType)}
        label="Basic"
        value={work?.songTitle || work?.contentId || "Draft"}
      />
      <ReviewItem
        complete={Boolean(work?.visible || work?.publishedAt)}
        label="Status"
        value={[
          work?.visible ? "Visible" : "Hidden",
          work?.publishedAt ? `Publish: ${work.publishedAt}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <ReviewItem
        complete={Boolean(
          work?.fromType === "Original" || work?.fromTitle || work?.fromIp,
        )}
        label="From"
        value={
          work?.fromType === "Original"
            ? "Original"
            : work?.fromTitle || work?.fromDetails || work?.fromIp || "Empty"
        }
      />
      <ReviewItem
        complete={Boolean(work?.relatedWorkUids)}
        label="Extra"
        value={work?.relatedWorkUids ? "Related set" : "No related content"}
      />
      <ReviewItem
        complete={distributionReview.complete}
        label="Distribution"
        value={distributionReview.value}
      />
      <ReviewItem
        complete={subtitleTrackCount > 0}
        label="Subtitles"
        value={
          subtitleTrackCount
            ? `${subtitleTrackCount} / ${SITE_LOCALES.length} subtitle locale(s) ready`
            : "Empty"
        }
      />
    </div>
  );
}

function getDistributionReview(work?: AdminMusicWork) {
  const items = [
    work?.u2bId ? "YouTube ID" : null,
    work?.bilibiliId ? "BiliBili ID" : null,
    work?.vkId ? "VK Video ID" : null,
    work?.pixivId ? "Pixiv ID" : null,
    work?.bilibiliTitle || work?.bilibiliDescription ? "BiliBili copy" : null,
    work?.vkTitle || work?.vkDescription ? "VK Video copy" : null,
    work?.pixivTitle || work?.pixivDescription ? "Pixiv copy" : null,
  ].filter(Boolean);
  const youtubeLocales = SITE_LOCALES.filter((locale) =>
    isYoutubeLocalizationFilled(work, locale),
  );

  if (youtubeLocales.length > 0) {
    items.push(`YouTube copy: ${youtubeLocales.join(", ")}`);
  }

  return {
    complete: items.length > 0,
    value: items.length > 0 ? items.join(" · ") : "Empty",
  };
}

function MusicWorkForm({
  currentStep,
  work,
  youtubePublicationStatus,
}: {
  currentStep: AdminEditorStep;
  work?: AdminMusicWork;
  youtubePublicationStatus: YouTubePublicationStatus;
}) {
  const youtubeReadyLocales = SITE_LOCALES.filter((locale) =>
    isYoutubeLocalizationFilled(work, locale),
  );
  const subtitleReadyLocales = SITE_LOCALES.filter((locale) =>
    Boolean(work?.subtitleTracks?.[locale]),
  );

  switch (currentStep) {
    case "metadata":
      return (
        <StepForm step="metadata" work={work}>
          <Section id="metadata" index={1} title="Metadata">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Content ID / UID"
                name="contentId"
                required
                value={work?.contentId}
              />
              <Field label="Path" name="path" value={work?.path} />
              <SelectField
                label="Work type"
                name="workType"
                options={WORK_TYPE_OPTIONS}
                required
                value={work?.workType}
              />
              <Field
                label="Song title"
                name="songTitle"
                placeholder="Optional station title"
                value={work?.songTitle}
              />
            </div>
            <StepSaveButton label="Save metadata" />
          </Section>
        </StepForm>
      );
    case "status":
      return (
        <StepForm step="status" work={work}>
          <Section id="status" index={2} title="Status">
            <div className="grid gap-4 md:grid-cols-2">
              <CheckboxField
                checked={Boolean(work?.visible)}
                description="Visible content can be shown on the public site."
                label="Visible"
                name="visible"
              />
              <Field
                label="Publish date"
                name="publishedAt"
                type="date"
                value={work?.publishedAt}
              />
              <ReadOnlyField
                description={getYouTubePublicationDescription(
                  youtubePublicationStatus,
                )}
                label="Published on YouTube"
                value={getYouTubePublicationLabel(youtubePublicationStatus)}
              />
            </div>
            <StepSaveButton label="Save status" />
          </Section>
        </StepForm>
      );
    case "from":
      return (
        <StepForm step="from" work={work}>
          <Section id="from" index={3} title="From">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="From type"
                name="fromType"
                options={FROM_TYPE_OPTIONS.map((value) => ({
                  label: value,
                  value,
                }))}
                placeholder="Select source category"
                value={work?.fromType}
              />
              <Field
                label="Title"
                name="fromTitle"
                placeholder="Original song or source work title"
                value={work?.fromTitle}
              />
              <Field
                label="Artist tags"
                name="fromArtists"
                placeholder="T.M.Revolution, See-Saw"
                value={work?.fromArtists?.join(", ")}
              />
              <Field
                label="Source"
                name="fromSource"
                placeholder="YouTube, Bilibili, wiki, official site..."
                type="url"
                value={work?.fromSource}
              />
              <Field
                label="IP"
                name="fromIp"
                placeholder="Gundam"
                value={work?.fromIp}
              />
              <Field
                label="Series"
                name="fromSeries"
                placeholder="Gundam SEED"
                value={work?.fromSeries}
              />
              <Field
                label="Session"
                name="fromSession"
                placeholder="Session 2"
                value={work?.fromSession}
              />
              <Field
                label="Details"
                name="fromDetails"
                placeholder="OP, ED, insert song..."
                value={work?.fromDetails}
              />
            </div>
            <StepSaveButton label="Save from" />
          </Section>
        </StepForm>
      );
    case "description":
      return (
        <StepForm step="description" work={work}>
          <Section id="description" index={4} title="Description">
            <Field
              label="Short description"
              name="shortDescription"
              value={work?.shortDescription}
            />
            <TextArea
              label="Intro text"
              name="introText"
              rows={5}
              value={work?.introText}
            />
            <TextArea
              label="Production notes"
              name="productionNotes"
              rows={5}
              value={work?.productionNotes}
            />
            <StepSaveButton label="Save description" />
          </Section>
        </StepForm>
      );
    case "lyrics":
      return (
        <StepForm step="lyrics" work={work}>
          <Section id="lyrics" index={5} title="Lyrics">
            <TextArea
              label="Lyrics"
              name="lyrics"
              rows={getTextRows(work?.lyrics, 18)}
              value={work?.lyrics}
            />
            <StepSaveButton label="Save lyrics" />
          </Section>
        </StepForm>
      );
    case "related":
      return (
        <StepForm step="related" work={work}>
          <Section id="related" index={6} title="Related">
            <TextArea
              label="Related content UIDs"
              name="relatedWorkUids"
              rows={4}
              value={work?.relatedWorkUids}
            />
            <StepSaveButton label="Save related" />
          </Section>
        </StepForm>
      );
    case "subtitles":
      return (
        <StepForm step="subtitles" work={work}>
          <Section id="subtitles" index={11} title="Subtitles">
            <AdminLocalePanels
              labels={SITE_LOCALE_LABELS}
              locales={SITE_LOCALES}
              readyLocales={subtitleReadyLocales}
            >
              {SITE_LOCALES.map((locale) => (
                <div data-locale={locale} key={locale}>
                  <SubtitleEditor locale={locale} work={work} />
                </div>
              ))}
            </AdminLocalePanels>
            <StepSaveButton label="Save subtitles" />
          </Section>
        </StepForm>
      );
    case "youtube":
      return (
        <StepForm step="youtube" work={work}>
          <Section id="youtube" index={7} title="YouTube">
            <DistributionPanel title="YouTube">
              <Field label="YouTube ID" name="u2bId" value={work?.u2bId} />
              <AdminLocalePanels
                labels={SITE_LOCALE_LABELS}
                locales={SITE_LOCALES}
                readyLocales={youtubeReadyLocales}
              >
                {SITE_LOCALES.map((locale) => (
                  <div data-locale={locale} key={locale}>
                    <YoutubeEditor locale={locale} work={work} />
                  </div>
                ))}
              </AdminLocalePanels>
            </DistributionPanel>
            <StepSaveButton label="Save YouTube" />
          </Section>
        </StepForm>
      );
    case "bilibili":
      return (
        <StepForm step="bilibili" work={work}>
          <Section id="bilibili" index={8} title="BiliBili">
            <DistributionPanel title="BiliBili">
              <Field
                label="BiliBili ID"
                name="bilibiliId"
                value={work?.bilibiliId}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <PlatformReference
                  content={getYoutubeLocalizationContent(work, "zh-CN")}
                  label="YouTube Chinese"
                />
                <PlatformTextFields
                  descriptionName="bilibiliDescription"
                  descriptionValue={work?.bilibiliDescription}
                  titleName="bilibiliTitle"
                  titleValue={work?.bilibiliTitle}
                />
              </div>
            </DistributionPanel>
            <StepSaveButton label="Save BiliBili" />
          </Section>
        </StepForm>
      );
    case "vk":
      return (
        <StepForm step="vk" work={work}>
          <Section id="vk" index={9} title="VK Video">
            <DistributionPanel title="VK Video">
              <Field label="VK ID" name="vkId" value={work?.vkId} />
              <div className="grid gap-4 lg:grid-cols-2">
                <PlatformReference
                  content={getYoutubeLocalizationContent(work, "ru-RU")}
                  label="YouTube Russian"
                />
                <PlatformTextFields
                  descriptionName="vkDescription"
                  descriptionValue={work?.vkDescription}
                  titleName="vkTitle"
                  titleValue={work?.vkTitle}
                />
              </div>
            </DistributionPanel>
            <StepSaveButton label="Save VK Video" />
          </Section>
        </StepForm>
      );
    case "pixiv":
      return (
        <StepForm step="pixiv" work={work}>
          <Section id="pixiv" index={10} title="Pixiv">
            <DistributionPanel title="Pixiv">
              <Field
                label="Pixiv post ID"
                name="pixivId"
                value={work?.pixivId}
              />
              <PlatformTextFields
                descriptionName="pixivDescription"
                descriptionValue={work?.pixivDescription}
                titleName="pixivTitle"
                titleValue={work?.pixivTitle}
              />
            </DistributionPanel>
            <StepSaveButton label="Save Pixiv" />
          </Section>
        </StepForm>
      );
  }
}

function YoutubeEditor({
  locale,
  work,
}: {
  locale: SiteLocale;
  work?: AdminMusicWork;
}) {
  const content = getYoutubeLocalizationContent(work, locale);
  const filled = isYoutubeLocalizationFilled(work, locale);

  return (
    <section
      className="scroll-mt-5 rounded-md border border-zinc-800 bg-zinc-950 p-4"
      id={`youtube-localization-${locale}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-100">
            {SITE_LOCALE_LABELS[locale]}
          </h3>
          <p className="text-xs text-zinc-500">{locale}</p>
        </div>
        <Badge
          className={
            filled
              ? "border-zinc-700 bg-zinc-100 text-zinc-950"
              : "border-zinc-700 bg-transparent text-zinc-400"
          }
          variant={filled ? "default" : "outline"}
        >
          {filled ? "ready" : "empty"}
        </Badge>
      </div>

      <div className="grid gap-4">
        <Field
          label="YouTube title"
          name={`youtubeLocalization.${locale}.title`}
          value={content.title}
        />
        <TextArea
          label="YouTube description"
          name={`youtubeLocalization.${locale}.description`}
          rows={getTextRows(content.description, 14)}
          value={content.description}
        />
      </div>
    </section>
  );
}

function DistributionPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="font-semibold text-zinc-100">{title}</h3>
      {children}
    </section>
  );
}

function PlatformReference({
  content,
  label,
}: {
  content: YoutubeLocalizationContent;
  label: string;
}) {
  return (
    <div className="grid gap-4 rounded-md border border-zinc-800 bg-zinc-900 p-3">
      <div>
        <div className="text-xs font-medium text-zinc-500">{label}</div>
        <div className="mt-1 text-sm font-medium text-zinc-100">
          {content.title || "No title"}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-zinc-500">Description</div>
        <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {content.description || "No description"}
        </div>
      </div>
    </div>
  );
}

function PlatformTextFields({
  descriptionName,
  descriptionValue,
  titleName,
  titleValue,
}: {
  descriptionName: string;
  descriptionValue?: string | null;
  titleName: string;
  titleValue?: string | null;
}) {
  return (
    <div className="grid gap-4">
      <Field label="Title" name={titleName} value={titleValue} />
      <TextArea
        label="Description"
        name={descriptionName}
        rows={getTextRows(descriptionValue, 8)}
        value={descriptionValue}
      />
    </div>
  );
}

function SubtitleEditor({
  locale,
  work,
}: {
  locale: SiteLocale;
  work?: AdminMusicWork;
}) {
  const value = work?.subtitleTracks?.[locale] ?? "";
  const filled = Boolean(value);

  return (
    <section
      className="scroll-mt-5 rounded-md border border-zinc-800 bg-zinc-900 p-4"
      id={`subtitle-${locale}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-100">
            {SITE_LOCALE_LABELS[locale]}
          </h3>
          <p className="text-xs text-zinc-500">{locale}</p>
        </div>
        <Badge
          className={
            filled
              ? "border-zinc-700 bg-zinc-100 text-zinc-950"
              : "border-zinc-700 bg-transparent text-zinc-400"
          }
          variant={filled ? "default" : "outline"}
        >
          {filled ? "has SRT" : "empty"}
        </Badge>
      </div>

      <TextArea
        label="SRT subtitles"
        name={`subtitleTracks.${locale}`}
        rows={getTextRows(value, 16)}
        value={value}
      />
    </section>
  );
}

function ReviewItem({
  complete,
  label,
  value,
}: {
  complete: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
        {complete ? (
          <CheckCircle2 className="h-4 w-4 text-zinc-300" />
        ) : (
          <Circle className="h-4 w-4 text-zinc-600" />
        )}
        {label}
      </div>
      <div className="text-sm text-zinc-100">{value}</div>
    </div>
  );
}

function getYoutubeLocalizationContent(
  work: AdminMusicWork | undefined,
  locale: SiteLocale,
) {
  return work?.youtubeLocalization?.[locale] ?? {};
}

function isYoutubeLocalizationFilled(
  work: AdminMusicWork | undefined,
  locale: SiteLocale,
) {
  const content = getYoutubeLocalizationContent(work, locale);
  return Boolean(content.title || content.description);
}

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
        {label}
      </Label>
      <Input
        className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
        defaultValue={value ?? ""}
        key={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

function CheckboxField({
  checked,
  description,
  label,
  name,
}: {
  checked?: boolean;
  description?: string;
  label: string;
  name: string;
}) {
  const id = `admin-field-${name}`;

  return (
    <div className="grid gap-2">
      <Label
        className="text-xs font-medium normal-case tracking-normal text-zinc-300"
        htmlFor={id}
      >
        {label}
      </Label>
      <div className="flex min-h-10 items-start gap-3 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 shadow-none">
        <Checkbox
          className="mt-0.5 border-zinc-700"
          defaultChecked={checked}
          id={id}
          key={name}
          name={name}
        />
        {description ? (
          <span className="text-xs leading-relaxed text-zinc-500">
            {description}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ReadOnlyField({
  description,
  label,
  value,
}: {
  description?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
        {label}
      </Label>
      <div className="min-h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-none">
        {value}
        {description ? (
          <div className="mt-1 text-xs leading-relaxed text-zinc-500">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getYouTubePublicationLabel(status: YouTubePublicationStatus) {
  if (status.status === "published") return "Yes";
  if (status.status === "not-published") return "No";
  return "Unknown";
}

function getYouTubePublicationDescription(status: YouTubePublicationStatus) {
  if (status.reason === "no-video-id") return "No YouTube ID has been saved.";
  if (status.reason === "thumbnail-found") {
    return "Detected by the shared YouTube thumbnail probe.";
  }
  if (status.reason === "thumbnail-missing") {
    return "The shared YouTube thumbnail probe did not find a public video.";
  }
  return "The shared YouTube probe could not be reached.";
}

function SelectField({
  label,
  name,
  options,
  placeholder,
  required,
  value,
}: {
  label: string;
  name: string;
  options: readonly { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  value?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
        {label}
      </Label>
      <Select
        defaultValue={value ?? undefined}
        key={name}
        name={name}
        required={required}
      >
        <SelectTrigger className="w-full border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none focus-visible:ring-zinc-500">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
      <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
        {label}
      </Label>
      <Textarea
        className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
        defaultValue={value ?? ""}
        key={name}
        name={name}
        rows={rows}
      />
    </div>
  );
}
