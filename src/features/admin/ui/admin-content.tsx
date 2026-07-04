import {
  SITE_LOCALE_LABELS,
  SITE_LOCALES,
  type SiteLocale,
} from "@sovia/shared/i18n/site-locale";
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
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Database,
  FileText,
  Globe2,
  LayoutDashboard,
  Link2,
  ListMusic,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { deleteMusicWorkAction, saveMusicWorkAction } from "../actions";
import { getAdminAuthStatus, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  listAdminMusicWorks,
} from "../data/music-admin";
import { AdminLogin } from "./login-form";

type AdminMusicWork = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];

const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";
const CARD_TITLE_CLASS = "text-zinc-100";
const CARD_DESCRIPTION_CLASS = "text-zinc-400";
const PRIMARY_BUTTON_CLASS =
  "border-zinc-950 bg-zinc-950 text-white shadow-none hover:bg-zinc-800";
const SECONDARY_BUTTON_CLASS =
  "border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700";
const GHOST_BUTTON_CLASS =
  "border-transparent bg-transparent text-zinc-300 shadow-none hover:bg-zinc-800 hover:text-white";

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

function DatabaseError({ message }: { message: string }) {
  return (
    <Alert className="border-zinc-700 bg-zinc-900 text-zinc-100">
      <AlertCircle className="mb-3 h-5 w-5 text-zinc-400" />
      <AlertTitle className="text-zinc-100">database error</AlertTitle>
      <AlertDescription className="text-zinc-400">{message}</AlertDescription>
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
  const works = databaseStatus.ok ? await listAdminMusicWorks() : [];

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
  query,
}: {
  error?: string;
  query?: string;
}) {
  return (
    <AdminGate>
      <ContentList error={error} query={query} />
    </AdminGate>
  );
}

async function ContentList({
  error,
  query,
}: {
  error?: string;
  query?: string;
}) {
  const databaseStatus = await getAdminDatabaseStatus();
  if (!databaseStatus.ok)
    return <DatabaseError message={databaseStatus.message} />;

  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const works = (await listAdminMusicWorks()).filter((work) =>
    [
      work.path,
      work.vid,
      work.title,
      work.original,
      work.u2bId,
      work.vkId,
      work.bilibiliId,
      work.pixivId,
      work.series,
      work.musicStyle,
      work.musicType,
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
      {error === "database" ? (
        <DatabaseError message="The last admin action could not be completed. Try again." />
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
                <select
                  className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
                  id="admin-content-type"
                  name="type"
                >
                  <option value="music">Music</option>
                </select>
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
    <div className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950">
      <table className="w-full min-w-[64rem] border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs font-medium text-zinc-400">
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">UID</th>
            <th className="px-4 py-3">YouTube</th>
            <th className="px-4 py-3">Subtitles</th>
            <th className="px-4 py-3">Distribution</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {works.map((work) => (
            <tr
              key={work.path}
              className="border-b border-zinc-800 transition hover:bg-zinc-900"
            >
              <td className="px-4 py-3 align-top">
                <Link
                  href={`/admin/content/${encodeURIComponent(work.path)}`}
                  className="block min-w-0"
                >
                  <div className="truncate font-semibold text-zinc-100">
                    {work.title}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500">
                    {work.shortDescription || work.original || "No summary"}
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 align-top text-sm text-zinc-400">
                {work.path}
              </td>
              <td className="px-4 py-3 align-top">
                <YoutubeLocalizationBadges work={work} />
              </td>
              <td className="px-4 py-3 align-top">
                <SubtitleBadges work={work} />
              </td>
              <td className="px-4 py-3 align-top">
                <PlatformBadges work={work} />
              </td>
              <td className="px-4 py-3 align-top text-right text-sm">
                <Button
                  asChild
                  className={GHOST_BUTTON_CLASS}
                  size="sm"
                  variant="ghost"
                >
                  <Link
                    href={`/admin/content/${encodeURIComponent(work.path)}`}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
        <span>Page 1</span>
        <span>{works.length} shown</span>
      </div>
    </div>
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

export async function AdminContentEditorPage({ id }: { id?: string }) {
  return (
    <AdminGate>
      <ContentEditor id={id} />
    </AdminGate>
  );
}

async function ContentEditor({ id }: { id?: string }) {
  const databaseStatus = await getAdminDatabaseStatus();
  if (!databaseStatus.ok)
    return <DatabaseError message={databaseStatus.message} />;

  const works = await listAdminMusicWorks();
  const work = id ? works.find((item) => item.path === id) : undefined;

  return (
    <section className="space-y-5">
      <Card className={CARD_CLASS}>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <Video className="h-4 w-4 text-zinc-500" />
              studio workflow
            </div>
            <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
              {work ? "Edit content" : "Add content"}
            </CardTitle>
            <CardDescription className={CARD_DESCRIPTION_CLASS}>
              Step through details, metadata, localization, distribution, and
              review before saving to the database.
            </CardDescription>
          </div>
          {work ? (
            <form action={deleteMusicWorkAction}>
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
        </CardHeader>
        <CardContent>
          {id && !work ? (
            <DatabaseError message="Content record was not found." />
          ) : (
            <MusicWorkForm work={work} />
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

function MusicWorkForm({ work }: { work?: AdminMusicWork }) {
  const isOriginal = Boolean(work?.isOriginal);
  const youtubeLocalizationCount = Object.keys(
    work?.youtubeLocalization ?? {},
  ).length;
  const subtitleTrackCount = Object.keys(work?.subtitleTracks ?? {}).length;
  const platformCount = [
    work?.u2bId,
    work?.bilibiliId,
    work?.vkId,
    work?.pixivId,
  ].filter(Boolean).length;

  return (
    <form
      action={saveMusicWorkAction}
      className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]"
    >
      {work && <input name="currentPath" type="hidden" value={work.path} />}

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
          <div className="px-2 pb-2 text-xs font-medium text-zinc-500">
            Upload flow
          </div>
          <nav className="space-y-1">
            <StepperLink
              href="#details"
              icon={<FileText />}
              index={1}
              label="Details"
            />
            <StepperLink
              href="#metadata"
              icon={<SlidersHorizontal />}
              index={2}
              label="Metadata"
            />
            <StepperLink
              href="#description"
              icon={<FileText />}
              index={3}
              label="Description"
            />
            <StepperLink
              href="#lyrics"
              icon={<ListMusic />}
              index={4}
              label="Lyrics"
            />
            <StepperLink
              href="#related"
              icon={<Link2 />}
              index={5}
              label="Related"
            />
            <StepperLink
              href="#localization"
              icon={<Globe2 />}
              index={6}
              label="Localization"
            />
            <StepperLink
              href="#subtitles"
              icon={<FileText />}
              index={7}
              label="Subtitles"
            />
            <StepperLink
              href="#distribution"
              icon={<Link2 />}
              index={8}
              label="Distribution"
            />
            <StepperLink
              href="#review"
              icon={<CheckCircle2 />}
              index={9}
              label="Review"
            />
          </nav>
        </div>
      </aside>

      <div className="grid gap-5">
        <Section id="details" index={1} title="Details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" name="title" required value={work?.title} />
            <Field label="UID / Path" name="path" required value={work?.path} />
            <Field label="Content ID" name="vid" value={work?.vid} />
            <Field
              label="Publish date"
              name="publishedAt"
              type="date"
              value={work?.publishedAt}
            />
            <label className="flex min-h-10 items-center gap-3 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
              <input
                className="h-4 w-4 accent-zinc-500"
                defaultChecked={isOriginal}
                name="isOriginal"
                type="checkbox"
              />
              Original work
            </label>
          </div>
        </Section>

        <Section id="metadata" index={2} title="Metadata">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Music style"
              name="musicStyle"
              value={work?.musicStyle}
            />
            <Field
              label="Music type"
              name="musicType"
              placeholder="OST / OP / ED"
              value={work?.musicType}
            />
            <Field
              label="Inspired by title"
              name="inspiredByTitle"
              value={work?.inspiredByTitle ?? work?.original}
            />
            <Field
              label="Original / legacy source"
              name="original"
              value={work?.original}
            />
            <Field
              label="Inspired by author"
              name="inspiredByAuthor"
              value={work?.inspiredByAuthor}
            />
            <Field
              label="Inspired by detail"
              name="inspiredByDetail"
              value={work?.inspiredByDetail}
            />
            <Field label="Series" name="series" value={work?.series} />
          </div>
        </Section>

        <Section id="description" index={3} title="Description">
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
        </Section>

        <Section id="lyrics" index={4} title="Lyrics">
          <TextArea
            label="Lyrics"
            name="lyrics"
            rows={14}
            value={work?.lyrics}
          />
        </Section>

        <Section id="related" index={5} title="Related">
          <TextArea
            label="Related content UIDs"
            name="relatedWorkUids"
            rows={4}
            value={work?.relatedWorkUids}
          />
        </Section>

        <Section id="localization" index={6} title="Localization">
          <div className="flex flex-wrap gap-2">
            {SITE_LOCALES.map((locale) => (
              <a
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                href={`#youtube-localization-${locale}`}
                key={locale}
              >
                {locale}
              </a>
            ))}
          </div>
          <div className="grid gap-5">
            {SITE_LOCALES.map((locale) => (
              <YoutubeLocalizationEditor
                key={locale}
                locale={locale}
                work={work}
              />
            ))}
          </div>
        </Section>

        <Section id="subtitles" index={7} title="Subtitles">
          <div className="grid gap-5">
            {SITE_LOCALES.map((locale) => (
              <SubtitleEditor key={locale} locale={locale} work={work} />
            ))}
          </div>
        </Section>

        <Section id="distribution" index={8} title="Distribution">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="YouTube ID" name="u2bId" value={work?.u2bId} />
            <Field
              label="Bilibili ID"
              name="bilibiliId"
              value={work?.bilibiliId}
            />
            <Field label="VK ID" name="vkId" value={work?.vkId} />
            <Field label="Pixiv post ID" name="pixivId" value={work?.pixivId} />
          </div>
        </Section>

        <Section id="review" index={9} title="Review">
          <div className="grid gap-3 md:grid-cols-4">
            <ReviewItem
              complete={Boolean(work?.title)}
              label="Default content"
              value={work?.title || "Title required"}
            />
            <ReviewItem
              complete={youtubeLocalizationCount > 0}
              label="YouTube localization"
              value={
                youtubeLocalizationCount
                  ? `${youtubeLocalizationCount} language(s)`
                  : "Empty"
              }
            />
            <ReviewItem
              complete={subtitleTrackCount > 0}
              label="Subtitles"
              value={
                subtitleTrackCount
                  ? `${subtitleTrackCount} SRT track(s)`
                  : "Empty"
              }
            />
            <ReviewItem
              complete={platformCount > 0}
              label="Distribution"
              value={`${platformCount} platform ID(s)`}
            />
          </div>
          <div className="flex justify-end">
            <Button className={PRIMARY_BUTTON_CLASS} type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save to database
            </Button>
          </div>
        </Section>
      </div>
    </form>
  );
}

function StepperLink({
  href,
  icon,
  index,
  label,
}: {
  href: string;
  icon: ReactNode;
  index: number;
  label: string;
}) {
  return (
    <a
      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
      href={href}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-800 text-xs text-zinc-400">
        {index}
      </span>
      <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function YoutubeLocalizationEditor({
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
      className="scroll-mt-5 rounded-md border border-zinc-800 bg-zinc-900 p-4"
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
          rows={7}
          value={content.description}
        />
      </div>
    </section>
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
        rows={9}
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
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
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
        name={name}
        rows={rows}
      />
    </div>
  );
}
