import { SITE_LOCALE_LABELS } from "@sovia/shared/i18n/site-locale";
import type { YoutubeLocalizationContent } from "@sovia/sound/model/music";
import {
  checkYouTubeVideoPublished,
  type YouTubePublicationStatus,
} from "@sovia/youtube-api";
import {
  AlertCircle,
  ArrowDown,
  ArrowRightToLine,
  ArrowUp,
  CheckCircle2,
  Circle,
  Database,
  Globe2,
  LayoutDashboard,
  ListMusic,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import Image from "next/image";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  clearMusicWorkStepAction,
  deleteAdminPromptAction,
  deleteAdminYoutubeLocaleAction,
  saveAdminPromptAction,
  saveAdminYoutubeLocaleAction,
  saveMusicWorkStepAction,
} from "../actions";
import {
  ADMIN_PROMPT_TASK_OPTIONS,
  BILIBILI_COPY_PROMPT_TASK,
  DEFAULT_PROMPT_VARIANT,
  DESCRIPTION_GENERATOR_PROMPT_TASK,
  getAdminPromptByKey,
  listAdminPrompts,
  listEnabledAdminPromptsForTask,
  PIXIV_COPY_PROMPT_TASK,
  RELATED_SUGGESTION_PROMPT_TASK,
  SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK,
  VK_COPY_PROMPT_TASK,
  YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
  YOUTUBE_LOCALIZATION_PROMPT_TASK,
} from "../data/admin-prompts";
import { getAdminAuthStatus, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  getAdminMusicWork,
  listAdminMusicWorks,
} from "../data/music-admin";
import {
  getAdminYoutubeConnection,
  getYoutubeOAuthConfig,
} from "../data/youtube-connection";
import { YOUTUBE_LANGUAGE_CATALOG } from "../data/youtube-language-catalog";
import {
  listAdminYoutubeLocales,
  listEnabledAdminYoutubeLocales,
} from "../data/youtube-locales";
import { AdminActionToast } from "./admin-action-toast";
import {
  type AdminEditorStep,
  matchAdminEditorStep,
} from "./admin-editor-steps";
import { AdminLocalePanels } from "./admin-locale-panels";
import {
  AdminConfirmForm,
  AdminCopyFieldButton,
  AdminDirtyForm,
  AdminDownloadSubtitlesButton,
  AdminGenerateDescriptionButton,
  AdminGeneratePlatformCopyButton,
  AdminGenerateSubtitleLocalizationBatchButton,
  AdminGenerateYoutubeLocalizationBatchButton,
  AdminGenerateYoutubeLocalizationButton,
  AdminSuggestRelatedButton,
  AdminSyncYoutubeCaptionsButton,
  AdminSyncYoutubeVideoButton,
} from "./admin-step-panels";
import { AdminLogin } from "./login-form";

type AdminMusicWork = Awaited<ReturnType<typeof listAdminMusicWorks>>[number];
type AdminPromptOption = Awaited<
  ReturnType<typeof listEnabledAdminPromptsForTask>
>[number];
type AdminYoutubeLocaleOption = Awaited<
  ReturnType<typeof listEnabledAdminYoutubeLocales>
>[number];

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
const CONTENT_PAGE_SIZE = 50;
const CONTENT_SORT_OPTIONS = ["publishedAt", "cid"] as const;
const CONTENT_SORT_ORDERS = ["asc", "desc"] as const;
type ContentSort = (typeof CONTENT_SORT_OPTIONS)[number];
type ContentSortOrder = (typeof CONTENT_SORT_ORDERS)[number];
type ActionStatus = "error" | "success";
const FIELD_STATE_CLASS =
  "group -m-2 grid gap-2 rounded-md border border-transparent border-l-4 p-2 transition-colors data-[field-state=changed]:border-l-yellow-400 data-[field-state=changed]:bg-yellow-400/5 data-[field-state=database]:border-l-sky-500 data-[field-state=database]:bg-sky-500/5 data-[field-state=empty]:border-l-zinc-700 data-[field-state=empty]:bg-zinc-900/30 data-[field-state=invalid]:border-l-red-500 data-[field-state=invalid]:bg-red-500/5 data-[field-state=warning]:border-l-orange-500 data-[field-state=warning]:bg-orange-500/5";

function matchActionStatus(value?: string): ActionStatus {
  return value === "success" ? "success" : "error";
}

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

export async function AdminDashboardPage({
  youtubeMessage,
  youtubeStatus,
}: {
  youtubeMessage?: string;
  youtubeStatus?: string;
} = {}) {
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
        <AdminActionToast
          message={youtubeMessage}
          status={matchActionStatus(youtubeStatus)}
        />
        <DashboardStatus />
      </section>
    </AdminGate>
  );
}

export async function AdminPromptsPage({
  message,
  status,
}: {
  message?: string;
  status?: string;
}) {
  return (
    <AdminGate>
      <PromptManager message={message} status={matchActionStatus(status)} />
    </AdminGate>
  );
}

export async function AdminYoutubeI18nPage({
  message,
  status,
}: {
  message?: string;
  status?: string;
}) {
  return (
    <AdminGate>
      <YoutubeI18nPage message={message} status={matchActionStatus(status)} />
    </AdminGate>
  );
}

export async function AdminPromptEditorPage({
  promptKey,
  message,
  status,
}: {
  message?: string;
  promptKey?: string;
  status?: string;
}) {
  return (
    <AdminGate>
      <PromptEditor
        message={message}
        promptKey={promptKey}
        status={matchActionStatus(status)}
      />
    </AdminGate>
  );
}

async function PromptManager({
  message,
  status,
}: {
  message?: string;
  status: ActionStatus;
}) {
  const prompts = await listAdminPrompts();

  return (
    <section className="space-y-5">
      <AdminActionToast message={message} status={status} />
      <Card className={CARD_CLASS}>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Sparkles className="h-4 w-4" />
            prompt library
          </div>
          <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
            Prompts
          </CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            Store admin AI prompts in PostgreSQL. The description generator uses
            task{" "}
            <span className="font-mono text-zinc-200">
              {DESCRIPTION_GENERATOR_PROMPT_TASK}
            </span>
            . Open a prompt to see its input and output contract.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className={CARD_CLASS}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className={CARD_TITLE_CLASS}>Prompt list</CardTitle>
            <CardDescription className={CARD_DESCRIPTION_CLASS}>
              {prompts.length} prompt(s)
            </CardDescription>
          </div>
          <Button asChild className={PRIMARY_BUTTON_CLASS}>
            <Link href="/admin/prompts/new">
              <Plus className="mr-2 h-4 w-4" />
              New prompt
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {prompts.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Task</TableHead>
                    <TableHead className="text-zinc-400">Variant</TableHead>
                    <TableHead className="text-zinc-400">Title</TableHead>
                    <TableHead className="text-zinc-400">Model</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-right text-zinc-400">
                      Edit
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prompts.map((prompt) => (
                    <TableRow className="border-zinc-800" key={prompt.id}>
                      <TableCell className="font-mono text-zinc-200">
                        {prompt.task}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-400">
                        {prompt.variant}
                      </TableCell>
                      <TableCell className="text-zinc-100">
                        {prompt.title}
                      </TableCell>
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
                          className={SECONDARY_BUTTON_CLASS}
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
          ) : (
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              No prompts yet. Create one with the button above.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

async function YoutubeI18nPage({
  message,
  status,
}: {
  message?: string;
  status: ActionStatus;
}) {
  const locales = await listAdminYoutubeLocales();
  const configuredLocaleSet = new Set(locales.map((locale) => locale.locale));
  const availableLanguageOptions = YOUTUBE_LANGUAGE_CATALOG.filter(
    (language) => !configuredLocaleSet.has(language.locale),
  ).map((language) => ({
    label: `${language.label} (${language.locale})`,
    value: language.locale,
  }));

  return (
    <section className="space-y-5">
      <AdminActionToast message={message} status={status} />
      <Card className={CARD_CLASS}>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Globe2 className="h-4 w-4" />
            YouTube localization
          </div>
          <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
            YouTube languages
          </CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            Manage the default language list used by the YouTube editor.
            Removing a language here does not delete existing per-work
            localizations.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className={CARD_TITLE_CLASS}>Add language</CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            Choose from the local YouTube language catalog saved in the
            codebase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDirtyForm
            action={saveAdminYoutubeLocaleAction}
            className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_auto_auto] md:items-end"
          >
            <SelectField
              label="Language"
              name="locale"
              options={availableLanguageOptions}
              placeholder={
                availableLanguageOptions.length
                  ? "Select YouTube language"
                  : "All catalog languages are configured"
              }
              required
              value=""
            />
            <Field label="Position" name="position" value="100" />
            <CheckboxField checked label="Enabled" name="enabled" />
            <Button
              className={PRIMARY_BUTTON_CLASS}
              disabled={!availableLanguageOptions.length}
              type="submit"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </AdminDirtyForm>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {locales.length ? (
          locales.map((locale) => (
            <Card className={CARD_CLASS} key={locale.id}>
              <CardContent className="pt-6">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                  <AdminDirtyForm
                    action={saveAdminYoutubeLocaleAction}
                    className="grid gap-4 xl:grid-cols-[160px_minmax(0,1fr)_120px_120px_auto] xl:items-end"
                  >
                    <Field
                      label="Locale"
                      name="locale"
                      readOnly
                      required
                      value={locale.locale}
                    />
                    <Field
                      label="Label"
                      name="label"
                      required
                      value={locale.label}
                    />
                    <Field
                      label="Position"
                      name="position"
                      value={String(locale.position)}
                    />
                    <CheckboxField
                      checked={locale.enabled}
                      label="Enabled"
                      name="enabled"
                    />
                    <Button className={PRIMARY_BUTTON_CLASS} type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </AdminDirtyForm>
                  <AdminConfirmForm
                    action={deleteAdminYoutubeLocaleAction}
                    message={`Remove "${locale.locale}" from the default YouTube localization language list? Existing song localizations will stay in the database.`}
                  >
                    <input name="locale" type="hidden" value={locale.locale} />
                    <Button
                      className="border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700"
                      type="submit"
                      variant="destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </AdminConfirmForm>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className={CARD_TITLE_CLASS}>
                No languages configured
              </CardTitle>
              <CardDescription className={CARD_DESCRIPTION_CLASS}>
                Add at least one enabled language to use YouTube localization
                actions.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </section>
  );
}

async function PromptEditor({
  message,
  promptKey,
  status,
}: {
  message?: string;
  promptKey?: string;
  status: ActionStatus;
}) {
  const isNew = !promptKey || promptKey === "new";
  const prompt = isNew ? null : await getAdminPromptByKey(promptKey);

  return (
    <section className="space-y-5">
      <AdminActionToast message={message} status={status} />
      <Card className={CARD_CLASS}>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Sparkles className="h-4 w-4" />
            prompt editor
          </div>
          <CardTitle className={`text-3xl ${CARD_TITLE_CLASS}`}>
            {isNew ? "New prompt" : (prompt?.title ?? "Prompt not found")}
          </CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            Prompt content is stored in PostgreSQL, not in source code.
          </CardDescription>
        </CardHeader>
      </Card>

      {!isNew && !prompt ? (
        <DatabaseError
          message="Prompt was not found."
          summary="Prompt was not found."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PromptForm
            mode={isNew ? "new" : "edit"}
            prompt={{
              content: prompt?.content ?? "",
              description: prompt?.description ?? "",
              enabled: prompt?.enabled ?? true,
              isDefault: prompt?.isDefault ?? true,
              key:
                prompt?.key ?? `${DESCRIPTION_GENERATOR_PROMPT_TASK}.default`,
              model: prompt?.model ?? "gpt-5",
              task: prompt?.task ?? DESCRIPTION_GENERATOR_PROMPT_TASK,
              title: prompt?.title ?? "Music description generator",
              variant: prompt?.variant ?? DEFAULT_PROMPT_VARIANT,
            }}
          />
          <PromptContractPanel />
        </div>
      )}
    </section>
  );
}

function PromptContractPanel() {
  const descriptionInputExample = `{
  "contentId": "251",
  "workType": "R",
  "songTitle": "Song title",
  "extraInstructions": "Manual instructions for this generation only.",
  "from": {
    "type": "Anime",
    "title": "Original song title",
    "artists": ["Artist name"],
    "sourceUrl": "https://example.com",
    "ip": "Source IP",
    "series": "Series name",
    "session": "Season 2",
    "details": "OP"
  },
  "lyrics": "Full lyrics text"
}`;
  const descriptionOutputExample = `{
  "shortDescription": "One concise sentence.",
  "introText": "Public page introduction.",
  "productionNotes": "Adaptation or production notes."
}`;
  const relatedInputExample = `{
  "currentWork": {
    "contentId": "252",
    "workType": "R",
    "songTitle": "Song title",
    "fromTitle": "Original song title",
    "ip": "Source IP",
    "series": "Series name",
    "details": "OP",
    "type": "Anime",
    "lyrics": "Current work lyrics excerpt"
  },
  "existingRelatedUids": ["251"],
  "extraInstructions": "Manual instructions for this generation only.",
  "candidates": [
    {
      "contentId": "243",
      "workType": "R",
      "songTitle": "Candidate song",
      "fromTitle": "Candidate original",
      "ip": "Candidate IP",
      "series": "Series name",
      "details": "OP",
      "type": "Anime",
      "publishedAt": "2026-07-01T00:00:00.000Z"
    }
  ]
}`;
  const relatedOutputExample = `{
  "candidates": [
    { "uid": "243", "reason": "Short reason." },
    { "uid": "244", "reason": "Short reason." },
    { "uid": "245", "reason": "Short reason." }
  ]
}`;
  const youtubeInputExample = `{
  "language": {
    "locale": "en",
    "label": "English"
  },
  "metadata": {
    "contentId": "123",
    "path": "123",
    "workType": "R",
    "songTitle": "Song title",
    "title": "Original imported title",
    "youtubeId": "dQw4w9WgXcQ",
    "publishedAt": "2026-07-01T00:00:00.000Z"
  },
  "from": {
    "type": "Anime",
    "title": "Original song title",
    "artists": ["Artist name"],
    "sourceUrl": "https://example.com",
    "ip": "Source IP",
    "series": "Series name",
    "session": "Season 2",
    "details": "OP"
  },
  "description": {
    "shortDescription": "Short internal description.",
    "introText": "Intro text from the Description step.",
    "productionNotes": "Production notes from the Description step."
  },
  "relatedWorks": [
    {
      "contentId": "124",
      "distributionIds": {
        "youtube": "relatedYouTubeId",
        "bilibili": "relatedBilibiliId",
        "vk": "relatedVkId",
        "pixiv": "relatedPixivId"
      },
      "workType": "R",
      "songTitle": "Related song title",
      "fromTitle": "Related original song",
      "ip": "Related source IP",
      "series": "Related series",
      "details": "ED",
      "type": "Anime",
      "publishedAt": "2026-07-02T00:00:00.000Z"
    }
  ],
  "lyrics": "Full lyrics text",
  "existingYoutubeLocalization": {
    "title": "Current YouTube title",
    "description": "Current YouTube description"
  },
  "extraInstructions": "Manual instructions for this generation only."
}`;
  const youtubeOutputExample = `{
  "title": "Localized YouTube title",
  "description": "Full localized YouTube description, including final hashtags at the end."
}`;
  const subtitleBatchInputExample = `{
  "contentId": "123",
  "metadata": {
    "contentId": "123",
    "path": "123",
    "workType": "R",
    "songTitle": "Song title",
    "title": "Original imported title",
    "youtubeId": "dQw4w9WgXcQ",
    "publishedAt": "2026-07-01T00:00:00.000Z"
  },
  "from": {
    "type": "Anime",
    "title": "Original song title",
    "artists": ["Artist name"],
    "sourceUrl": "https://example.com",
    "ip": "Source IP",
    "series": "Series name",
    "session": "Season 2",
    "details": "OP"
  },
  "description": {
    "shortDescription": "Short internal description.",
    "introText": "Intro text from the Description step.",
    "productionNotes": "Production notes from the Description step."
  },
  "sourceLanguage": {
    "locale": "en-US",
    "label": "English"
  },
  "sourceSrt": "1\\n00:00:00,000 --> 00:00:02,000\\nSubtitle text",
  "targetLanguages": [
    {
      "locale": "zh-CN",
      "label": "Simplified Chinese",
      "existingSrt": ""
    }
  ],
  "requiredOutputLocales": ["zh-CN"],
  "extraInstructions": "Manual instructions for this generation only."
}`;
  const subtitleBatchOutputExample = `{
  "localizations": [
    {
      "locale": "zh-CN",
      "srt": "1\\n00:00:00,000 --> 00:00:02,000\\n翻译后的字幕"
    }
  ]
}`;
  const platformInputExample = `{
  "platform": {
    "name": "bilibili",
    "id": "BV1xx411c7mD"
  },
  "targetLanguage": {
    "locale": "zh",
    "label": "Chinese"
  },
  "metadata": {
    "contentId": "123",
    "path": "123",
    "workType": "R",
    "songTitle": "Song title",
    "title": "Original imported title",
    "youtubeId": "dQw4w9WgXcQ",
    "publishedAt": "2026-07-01T00:00:00.000Z"
  },
  "from": {
    "type": "Anime",
    "title": "Original song title",
    "artists": ["Artist name"],
    "sourceUrl": "https://example.com",
    "ip": "Source IP",
    "series": "Series name",
    "session": "Season 2",
    "details": "OP"
  },
  "description": {
    "shortDescription": "Short internal description.",
    "introText": "Intro text from the Description step.",
    "productionNotes": "Production notes from the Description step."
  },
  "referenceYoutubeLocalization": {
    "locale": "zh",
    "title": "Reference YouTube title",
    "description": "Reference YouTube description"
  },
  "relatedWorks": [],
  "lyrics": "Full lyrics text",
  "existingPlatformCopy": {
    "title": "Current platform title",
    "description": "Current platform description"
  },
  "extraInstructions": "Manual instructions for this generation only."
}`;
  const platformOutputExample = `{
  "title": "Platform title",
  "description": "Platform description"
}`;
  const pixivOutputExample = `{
  "title": "Pixiv title",
  "description": "Pixiv description",
  "tags": ["#ComradeSovia", "#anime", "#song"]
}`;

  return (
    <aside className="space-y-4">
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className={CARD_TITLE_CLASS}>Prompt contract</CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            Use this structure when writing prompts. Prompt content is private
            to the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-zinc-400">
          <PromptContractBlock
            inputExample={descriptionInputExample}
            notes="Return concise copy for the Description step."
            outputExample={descriptionOutputExample}
            task={DESCRIPTION_GENERATOR_PROMPT_TASK}
          />
          <PromptContractBlock
            inputExample={relatedInputExample}
            notes="Return exactly 3 existing content UIDs from candidates. Do not return the current work or already related UIDs."
            outputExample={relatedOutputExample}
            task={RELATED_SUGGESTION_PROMPT_TASK}
          />
          <PromptContractBlock
            inputExample={youtubeInputExample}
            notes="Return YouTube title and the complete description in the target language.locale. Put all final hashtags at the end of description; do not output a separate hashtags field."
            outputExample={youtubeOutputExample}
            task={YOUTUBE_LOCALIZATION_PROMPT_TASK}
          />
          <PromptContractBlock
            inputExample={subtitleBatchInputExample}
            notes="Return complete translated SRT tracks. Preserve cue numbers, timestamps, and SRT structure exactly; translate only subtitle text."
            outputExample={subtitleBatchOutputExample}
            task={SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK}
          />
          <PromptContractBlock
            inputExample={platformInputExample}
            notes="Return platform-native title and description. BiliBili targets Chinese; VK targets Russian. Use referenceYoutubeLocalization when available."
            outputExample={platformOutputExample}
            task={BILIBILI_COPY_PROMPT_TASK}
          />
          <PromptContractBlock
            inputExample={platformInputExample
              .replace(
                '"name": "bilibili",\n    "id": "BV1xx411c7mD"',
                '"name": "vk",\n    "id": "video-123_456"',
              )
              .replace(
                '"locale": "zh",\n    "label": "Chinese"',
                '"locale": "ru",\n    "label": "Russian"',
              )}
            notes="Return platform-native title and description for VK in Russian. Use referenceYoutubeLocalization when available."
            outputExample={platformOutputExample}
            task={VK_COPY_PROMPT_TASK}
          />
          <PromptContractBlock
            inputExample={platformInputExample
              .replace(
                '"name": "bilibili",\n    "id": "BV1xx411c7mD"',
                '"name": "pixiv",\n    "id": "123456789"',
              )
              .replace(
                '"locale": "zh",\n    "label": "Chinese"',
                '"locale": "en",\n    "label": "English"',
              )
              .replace(
                '"locale": "zh",\n    "title": "Reference YouTube title"',
                '"locale": "en",\n    "title": "Reference YouTube title"',
              )
              .replace(
                '"description": "Current platform description"',
                '"description": "Current platform description",\n    "tags": "#ComradeSovia, #anime, #song"',
              )}
            notes="Return Pixiv title, description, and tags. Tags must be an array of strings such as #ComradeSovia."
            outputExample={pixivOutputExample}
            task={PIXIV_COPY_PROMPT_TASK}
          />
        </CardContent>
      </Card>
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className={CARD_TITLE_CLASS}>How it is used</CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            The prompt text becomes the developer message. The input JSON is
            sent as the user message. The model output is validated and applied
            to the current form first, then you decide whether to save it.
          </CardDescription>
        </CardHeader>
      </Card>
    </aside>
  );
}

function PromptContractBlock({
  inputExample,
  notes,
  outputExample,
  task,
}: {
  inputExample: string;
  notes: string;
  outputExample: string;
  task: string;
}) {
  return (
    <details
      className="rounded-md border border-zinc-800 bg-zinc-950/40"
      open={task === DESCRIPTION_GENERATOR_PROMPT_TASK}
    >
      <summary className="cursor-pointer select-none p-3">
        <span className="block text-xs font-medium text-zinc-300">Task</span>
        <code className="mt-1 block text-xs text-zinc-100">{task}</code>
        <span className="mt-2 block text-xs leading-5 text-zinc-500">
          {notes}
        </span>
      </summary>
      <div className="grid gap-3 border-t border-zinc-800 p-3">
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-300">
            Input JSON
          </div>
          <pre className="max-h-80 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-300">
            {inputExample}
          </pre>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-300">
            Required output JSON
          </div>
          <pre className="overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-300">
            {outputExample}
          </pre>
        </div>
      </div>
    </details>
  );
}

function PromptForm({
  mode,
  prompt,
}: {
  mode: "edit" | "new";
  prompt: {
    content: string;
    description?: string | null;
    enabled: boolean;
    isDefault: boolean;
    key: string;
    model: string;
    task: string;
    title: string;
    variant: string;
  };
}) {
  const editorPath =
    mode === "new"
      ? "/admin/prompts/new"
      : `/admin/prompts/${encodeURIComponent(prompt.key)}`;

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className={CARD_TITLE_CLASS}>
              {mode === "new" ? "New prompt" : prompt.title}
            </CardTitle>
            <CardDescription className={CARD_DESCRIPTION_CLASS}>
              <span className="font-mono">{prompt.task || "prompt.task"}</span>
              {" / "}
              <span className="font-mono">{prompt.variant || "variant"}</span>
              {prompt.isDefault
                ? " · default"
                : prompt.enabled
                  ? " · enabled"
                  : " · disabled"}
            </CardDescription>
          </div>
          {mode === "edit" ? (
            <AdminConfirmForm
              action={deleteAdminPromptAction}
              message={`Delete prompt "${prompt.key}"? This cannot be undone.`}
            >
              <input name="key" type="hidden" value={prompt.key} />
              <Button
                className="border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700"
                type="submit"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AdminConfirmForm>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <AdminDirtyForm action={saveAdminPromptAction} className="grid gap-4">
          <input name="errorPath" type="hidden" value={editorPath} />
          {mode === "edit" ? (
            <input name="currentKey" type="hidden" value={prompt.key} />
          ) : null}
          <FieldStateGuide />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Task"
              name="task"
              options={ADMIN_PROMPT_TASK_OPTIONS}
              placeholder="Select prompt task"
              required
              value={prompt.task}
            />
            <Field
              label="Variant"
              name="variant"
              required
              value={prompt.variant}
            />
            <Field label="Model" name="model" required value={prompt.model} />
            <Field label="Title" name="title" required value={prompt.title} />
            <CheckboxField
              checked={prompt.enabled}
              description="Disabled prompts are ignored by generation actions."
              label="Enabled"
              name="enabled"
            />
            <CheckboxField
              checked={prompt.isDefault}
              description="Default prompt is used automatically for this task."
              label="Default"
              name="isDefault"
            />
          </div>
          <Field
            label="Description"
            name="description"
            value={prompt.description}
          />
          <TextArea
            label="Prompt content"
            name="content"
            rows={getTextRows(prompt.content, 14)}
            value={prompt.content}
          />
          <div className="flex justify-end">
            <Button className={PRIMARY_BUTTON_CLASS} type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save prompt
            </Button>
          </div>
        </AdminDirtyForm>
      </CardContent>
    </Card>
  );
}

function PromptTextarea({
  label,
  name,
  rows,
  value,
}: {
  label: string;
  name: string;
  rows: number;
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

function PromptSelect({
  label,
  name,
  options,
  placeholder,
  value,
}: {
  label: string;
  name: string;
  options: readonly { label: string; value: string }[];
  placeholder?: string;
  value?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium normal-case tracking-normal text-zinc-300">
        {label}
      </Label>
      <select
        className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        defaultValue={value ?? ""}
        key={name}
        name={name}
        suppressHydrationWarning
      >
        {placeholder ? (
          <option disabled value="">
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

async function DashboardStatus() {
  const databaseStatus = await getAdminDatabaseStatus();
  const works = await listAdminMusicWorks();
  const youtubeConfig = getYoutubeOAuthConfig();
  const youtubeConnection = databaseStatus.ok
    ? await getAdminYoutubeConnection()
    : null;

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
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Video className="h-4 w-4" />
            YouTube content management
          </div>
          <CardTitle className={CARD_TITLE_CLASS}>
            {youtubeConnection
              ? youtubeConnection.channelTitle
              : "Not connected"}
          </CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            {youtubeConnection
              ? `Channel ${youtubeConnection.channelId} · connected ${youtubeConnection.connectedAt.toLocaleDateString("en-US")}`
              : youtubeConfig.ok
                ? "Authorize a YouTube channel to sync video metadata."
                : `Missing configuration: ${youtubeConfig.missing.join(", ")}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {youtubeConfig.ok ? (
            <Button asChild className={PRIMARY_BUTTON_CLASS}>
              <Link href="/admin/youtube/connect">
                {youtubeConnection ? "Reconnect YouTube" : "Connect YouTube"}
              </Link>
            </Button>
          ) : null}
          {youtubeConnection ? (
            <form action="/admin/youtube/disconnect" method="post">
              <Button className={SECONDARY_BUTTON_CLASS} type="submit">
                Disconnect
              </Button>
            </form>
          ) : null}
        </CardContent>
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
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className={CARD_TITLE_CLASS}>Prompts</CardTitle>
          <CardDescription className={CARD_DESCRIPTION_CLASS}>
            <Link className="text-zinc-100 underline" href="/admin/prompts">
              Manage prompt library
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export async function AdminContentListPage({
  error,
  message,
  order,
  page,
  query,
  sort,
  status,
}: {
  error?: string;
  message?: string;
  order?: string;
  page?: string;
  query?: string;
  sort?: string;
  status?: string;
}) {
  return (
    <AdminGate>
      <ContentList
        error={error}
        message={message}
        order={order}
        page={page}
        query={query}
        sort={sort}
        status={status}
      />
    </AdminGate>
  );
}

async function ContentList({
  error,
  message,
  order,
  page,
  query,
  sort,
  status,
}: {
  error?: string;
  message?: string;
  order?: string;
  page?: string;
  query?: string;
  sort?: string;
  status?: string;
}) {
  const databaseStatus = await getAdminDatabaseStatus();

  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const contentSort = matchContentSort(sort);
  const contentSortOrder = matchContentSortOrder(order);
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const filteredWorks = (await listAdminMusicWorks())
    .filter((work) =>
      [
        work.path,
        work.contentId,
        work.storageSource,
        work.visible ? "visible" : "hidden",
        work.publishedAt,
        work.songTitle,
        work.title,
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
        work.pixivTags,
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
    )
    .sort((first, second) =>
      compareContentWorks(first, second, contentSort, contentSortOrder),
    );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredWorks.length / CONTENT_PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const works = filteredWorks.slice(
    (safePage - 1) * CONTENT_PAGE_SIZE,
    safePage * CONTENT_PAGE_SIZE,
  );

  return (
    <section className="space-y-5">
      <AdminActionToast
        message={
          message ?? (error === "database" ? "Database error." : undefined)
        }
        status={matchActionStatus(status)}
      />

      {error === "database" ? (
        <DatabaseError
          message="The last admin action could not be completed. Try again."
          summary="The last admin action could not be completed."
        />
      ) : null}

      {!databaseStatus.ok ? (
        <DatabaseError
          message={`${databaseStatus.message}\n\nDatabase-backed content cannot be loaded until the connection and schema are available.`}
          summary="Database is not fully available. Content records may be unavailable until the connection is restored."
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
            <input name="sort" type="hidden" value={contentSort} />
            <input name="order" type="hidden" value={contentSortOrder} />
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
                  className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                  defaultValue="music"
                  id="admin-content-type"
                  name="type"
                  suppressHydrationWarning
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
          <ContentTable
            order={contentSortOrder}
            page={safePage}
            query={query}
            sort={contentSort}
            totalCount={filteredWorks.length}
            totalPages={totalPages}
            works={works}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function matchContentSort(value?: string): ContentSort {
  return CONTENT_SORT_OPTIONS.includes(value as ContentSort)
    ? (value as ContentSort)
    : "publishedAt";
}

function matchContentSortOrder(value?: string): ContentSortOrder {
  return CONTENT_SORT_ORDERS.includes(value as ContentSortOrder)
    ? (value as ContentSortOrder)
    : "desc";
}

function compareContentWorks(
  first: AdminMusicWork,
  second: AdminMusicWork,
  sort: ContentSort,
  order: ContentSortOrder,
) {
  const direction = order === "asc" ? 1 : -1;

  if (sort === "cid") {
    return (
      direction *
      first.contentId.localeCompare(second.contentId, undefined, {
        numeric: true,
      })
    );
  }

  const firstTime = Date.parse(first.publishedAt ?? "");
  const secondTime = Date.parse(second.publishedAt ?? "");
  const normalizedFirst = Number.isNaN(firstTime) ? 0 : firstTime;
  const normalizedSecond = Number.isNaN(secondTime) ? 0 : secondTime;

  if (normalizedFirst !== normalizedSecond) {
    return direction * (normalizedFirst - normalizedSecond);
  }

  return first.contentId.localeCompare(second.contentId, undefined, {
    numeric: true,
  });
}

function getContentPageHref({
  order,
  page,
  query,
  sort,
}: {
  order: ContentSortOrder;
  page: number;
  query?: string;
  sort: ContentSort;
}) {
  const params = new URLSearchParams();
  const normalizedQuery = query?.trim();

  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }
  if (sort !== "publishedAt") {
    params.set("sort", sort);
  }
  if (order !== "desc") {
    params.set("order", order);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `/admin/content?${search}` : "/admin/content";
}

function ContentTable({
  order,
  page,
  query,
  sort,
  totalCount,
  totalPages,
  works,
}: {
  order: ContentSortOrder;
  page: number;
  query?: string;
  sort: ContentSort;
  totalCount: number;
  totalPages: number;
  works: AdminMusicWork[];
}) {
  if (!works.length) {
    return (
      <div className="rounded-md border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400">
        No content records match this search.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table className="min-w-full table-auto">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Edit</TableHead>
            <TableHead className="w-28">Thumbnail</TableHead>
            <SortableTableHead
              activeSort={sort}
              className="w-32"
              label="Published"
              order={order}
              query={query}
              sort="publishedAt"
            />
            <ResizableTableHead className="min-w-72" label="Song" />
            <ResizableTableHead className="min-w-36" label="Platforms" />
            <SortableTableHead
              activeSort={sort}
              className="w-24"
              label="CID"
              order={order}
              query={query}
              sort="cid"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {works.map((work) => (
            <TableRow key={work.contentId}>
              <TableCell className="align-top">
                <Button asChild size="sm" variant="ghost">
                  <Link
                    href={`/admin/content/${encodeURIComponent(work.contentId)}`}
                    title="Edit content"
                  >
                    <Pencil />
                  </Link>
                </Button>
              </TableCell>
              <TableCell className="align-top">
                <ContentThumbnail work={work} />
              </TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {work.publishedAt || "Unpublished"}
              </TableCell>
              <TableCell className="min-w-0 align-top whitespace-normal">
                <Link
                  href={`/admin/content/${encodeURIComponent(work.contentId)}`}
                  className="block min-w-0"
                >
                  <div className="line-clamp-2 font-medium leading-snug">
                    <ContentSongLabel work={work} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <StorageSourceBadge source={work.storageSource} />
                    <WorkVisibilityBadge visible={Boolean(work.visible)} />
                    <SubtitleBadges work={work} />
                  </div>
                </Link>
              </TableCell>
              <TableCell className="align-top whitespace-normal">
                <PlatformBadges work={work} />
              </TableCell>
              <TableCell className="align-top font-mono text-xs text-muted-foreground">
                {work.contentId}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        <span>
          Page {page} / {totalPages}
        </span>
        <span>
          {works.length} shown, {totalCount} total
        </span>
        <div className="flex items-center gap-2">
          <Button
            asChild={page > 1}
            className={SECONDARY_BUTTON_CLASS}
            disabled={page <= 1}
            size="sm"
            variant="outline"
          >
            {page > 1 ? (
              <Link
                href={getContentPageHref({
                  order,
                  page: page - 1,
                  query,
                  sort,
                })}
              >
                Previous
              </Link>
            ) : (
              <span>Previous</span>
            )}
          </Button>
          <Button
            asChild={page < totalPages}
            className={SECONDARY_BUTTON_CLASS}
            disabled={page >= totalPages}
            size="sm"
            variant="outline"
          >
            {page < totalPages ? (
              <Link
                href={getContentPageHref({
                  order,
                  page: page + 1,
                  query,
                  sort,
                })}
              >
                Next
              </Link>
            ) : (
              <span>Next</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortableTableHead({
  activeSort,
  className,
  label,
  order,
  query,
  sort,
}: {
  activeSort: ContentSort;
  className?: string;
  label: string;
  order: ContentSortOrder;
  query?: string;
  sort: ContentSort;
}) {
  const isActive = activeSort === sort;
  const nextOrder: ContentSortOrder =
    isActive && order === "desc" ? "asc" : "desc";
  const Icon = !isActive ? Circle : order === "desc" ? ArrowDown : ArrowUp;

  return (
    <TableHead className={className}>
      <Link
        className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-white"
        href={getContentPageHref({
          order: nextOrder,
          page: 1,
          query,
          sort,
        })}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </Link>
    </TableHead>
  );
}

function ContentSongLabel({ work }: { work: AdminMusicWork }) {
  const songName = work.songTitle || work.title || "empty";
  const sourceName = [work.fromSeries, work.fromSession, work.fromDetails]
    .filter(Boolean)
    .join(" ");

  return sourceName ? `${songName} - ${sourceName}` : songName;
}

function ResizableTableHead({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <TableHead className="p-0 align-top">
      <div
        className={`resize-x overflow-auto px-2 py-2 ${className ?? ""}`}
        title="Drag the lower-right edge to resize this column"
      >
        {label}
      </div>
    </TableHead>
  );
}

function ContentThumbnail({ work }: { work: AdminMusicWork }) {
  if (!work.u2bId) {
    return (
      <div className="grid aspect-video w-24 place-items-center rounded-md border border-zinc-800 bg-zinc-950 text-xs text-zinc-500">
        No image
      </div>
    );
  }

  return (
    <Image
      alt=""
      className="aspect-video w-24 rounded-md border border-zinc-800 bg-zinc-950 object-cover"
      height={54}
      loading="lazy"
      src={`/api/u2b-thumbnail?id=${encodeURIComponent(work.u2bId)}`}
      unoptimized
      width={96}
    />
  );
}

function WorkVisibilityBadge({ visible }: { visible?: boolean }) {
  return (
    <Badge
      className={
        visible
          ? "border-emerald-700 bg-emerald-950 text-emerald-100"
          : "border-zinc-700 bg-transparent text-zinc-400"
      }
      variant="outline"
    >
      {visible ? "Visible" : "Hidden"}
    </Badge>
  );
}

function StorageSourceBadge({
  source,
}: {
  source?: AdminMusicWork["storageSource"];
}) {
  const label =
    source === "db+file" ? "DB + file" : source === "db" ? "DB" : "Unknown";
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
  status,
  step,
}: {
  id?: string;
  message?: string;
  status?: string;
  step?: string;
}) {
  return (
    <AdminGate>
      <ContentEditor
        id={id}
        message={message}
        status={matchActionStatus(status)}
        step={matchAdminEditorStep(step)}
      />
    </AdminGate>
  );
}

async function ContentEditor({
  id,
  message,
  status,
  step,
}: {
  id?: string;
  message?: string;
  status: ActionStatus;
  step: AdminEditorStep;
}) {
  const databaseStatus = await getAdminDatabaseStatus();

  const work = id ? ((await getAdminMusicWork(id)) ?? undefined) : undefined;
  const descriptionPrompts =
    step === "description"
      ? await listEnabledAdminPromptsForTask(DESCRIPTION_GENERATOR_PROMPT_TASK)
      : [];
  const relatedPrompts =
    step === "related"
      ? await listEnabledAdminPromptsForTask(RELATED_SUGGESTION_PROMPT_TASK)
      : [];
  const bilibiliPrompts =
    step === "bilibili"
      ? await listEnabledAdminPromptsForTask(BILIBILI_COPY_PROMPT_TASK)
      : [];
  const vkPrompts =
    step === "vk"
      ? await listEnabledAdminPromptsForTask(VK_COPY_PROMPT_TASK)
      : [];
  const pixivPrompts =
    step === "pixiv"
      ? await listEnabledAdminPromptsForTask(PIXIV_COPY_PROMPT_TASK)
      : [];
  const subtitleBatchPrompts =
    step === "subtitles"
      ? await listEnabledAdminPromptsForTask(
          SUBTITLE_LOCALIZATION_BATCH_PROMPT_TASK,
        )
      : [];
  const youtubePrompts =
    step === "youtube"
      ? await listEnabledAdminPromptsForTask(YOUTUBE_LOCALIZATION_PROMPT_TASK)
      : [];
  const youtubeBatchPrompts =
    step === "youtube"
      ? await listEnabledAdminPromptsForTask(
          YOUTUBE_LOCALIZATION_BATCH_PROMPT_TASK,
        )
      : [];
  const youtubeLocaleConfig =
    step === "youtube" || step === "subtitles"
      ? await listEnabledAdminYoutubeLocales()
      : [];
  const youtubePublicationStatus = await checkYouTubeVideoPublished(
    work?.u2bId,
  );

  return (
    <section className="space-y-5">
      <AdminActionToast message={message} status={status} />

      {!databaseStatus.ok ? (
        <DatabaseError
          message={`${databaseStatus.message}\n\nThe editor cannot load database-backed content until the connection and schema are available.`}
          summary="Database is not fully available. The editor may not be able to load this content record."
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
              <AdminConfirmForm
                action={clearMusicWorkStepAction}
                message={`Clear data for the ${step} step? This will not delete the whole content record.`}
              >
                <input name="adminStep" type="hidden" value={step} />
                <input name="contentId" type="hidden" value={work.contentId} />
                <input name="path" type="hidden" value={work.path} />
                <Button
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700"
                  type="submit"
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear step data
                </Button>
              </AdminConfirmForm>
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
              bilibiliPrompts={bilibiliPrompts}
              descriptionPrompts={descriptionPrompts}
              pixivPrompts={pixivPrompts}
              relatedPrompts={relatedPrompts}
              subtitleBatchPrompts={subtitleBatchPrompts}
              vkPrompts={vkPrompts}
              work={work}
              youtubeBatchPrompts={youtubeBatchPrompts}
              youtubeLocaleConfig={youtubeLocaleConfig}
              youtubePrompts={youtubePrompts}
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
      <FieldStateGuide />
      {children}
    </AdminDirtyForm>
  );
}

function FieldStateGuide() {
  const items = [
    ["border-zinc-700 bg-zinc-900/40", "Empty"],
    ["border-sky-500 bg-sky-500/10", "Database"],
    ["border-yellow-400 bg-yellow-400/10", "Modified"],
    ["border-orange-500 bg-orange-500/10", "Warning"],
    ["border-red-500 bg-red-500/10", "Blocking"],
  ] as const;

  return (
    <details className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
      <summary className="cursor-pointer select-none font-medium text-zinc-200">
        Field colors
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map(([className, label]) => (
          <span
            className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 ${className}`}
            key={label}
          >
            <span className="h-3 w-1.5 rounded-full bg-current" />
            {label}
          </span>
        ))}
      </div>
    </details>
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

function DescriptionAiActions({
  contentId,
  prompts,
}: {
  contentId: string;
  prompts: AdminPromptOption[];
}) {
  const defaultPrompt = prompts.find((prompt) => prompt.isDefault);

  return (
    <AiActionsDrawer
      description="Use a prompt variant and optional one-time notes."
      title="Generate description"
    >
      <PromptSelect
        label="Prompt"
        name="promptKey"
        options={prompts.map((prompt) => ({
          label: `${prompt.isDefault ? "[default] " : ""}${prompt.title} (${prompt.variant})`,
          value: prompt.key,
        }))}
        placeholder="Use default prompt"
        value={defaultPrompt?.key}
      />
      {!prompts.length ? (
        <p className="-mt-2 text-xs leading-5 text-red-300">
          No enabled prompts are available for this task.
        </p>
      ) : null}
      <PromptTextarea
        label="Generation notes"
        name="generationNotes"
        rows={4}
        value=""
      />
      <p className="-mt-2 text-xs leading-5 text-zinc-500">
        These notes are sent to the model as input and are not saved.
      </p>
      <div className="flex justify-end">
        <AdminGenerateDescriptionButton
          className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
          contentId={contentId}
          disabled={!prompts.length}
        />
      </div>
    </AiActionsDrawer>
  );
}

function RelatedAiActions({
  contentId,
  prompts,
}: {
  contentId: string;
  prompts: AdminPromptOption[];
}) {
  const defaultPrompt = prompts.find((prompt) => prompt.isDefault);

  return (
    <AiActionsDrawer
      description="Use this work and the content list to suggest 3 candidates."
      title="Suggest related"
    >
      <PromptSelect
        label="Prompt"
        name="promptKey"
        options={prompts.map((prompt) => ({
          label: `${prompt.isDefault ? "[default] " : ""}${prompt.title} (${prompt.variant})`,
          value: prompt.key,
        }))}
        placeholder="Use default prompt"
        value={defaultPrompt?.key}
      />
      {!prompts.length ? (
        <p className="-mt-2 text-xs leading-5 text-red-300">
          No enabled prompts are available for this task.
        </p>
      ) : null}
      <PromptTextarea
        label="Generation notes"
        name="generationNotes"
        rows={4}
        value=""
      />
      <p className="-mt-2 text-xs leading-5 text-zinc-500">
        These notes are sent to the model as input and are not saved.
      </p>
      <div className="flex justify-end">
        <AdminSuggestRelatedButton
          className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
          contentId={contentId}
          disabled={!prompts.length}
        />
      </div>
    </AiActionsDrawer>
  );
}

function YoutubeAiActions({
  batchPrompts,
  contentId,
  prompts,
  localeLabels,
  locales,
  youtubeId,
}: {
  batchPrompts: AdminPromptOption[];
  contentId: string;
  prompts: AdminPromptOption[];
  localeLabels: Record<string, string>;
  locales: readonly string[];
  youtubeId?: string | null;
}) {
  const defaultPrompt = prompts.find((prompt) => prompt.isDefault);
  const defaultBatchPrompt = batchPrompts.find((prompt) => prompt.isDefault);
  const disabled = !prompts.length || !youtubeId;
  const batchDisabled = !batchPrompts.length || !youtubeId;

  return (
    <>
      <AiActionsDrawer
        description="Use metadata, source, lyrics, and description fields to generate copy for the primary language."
        title="Generate YouTube copy"
      >
        <PromptSelect
          label="Current language prompt"
          name="youtubeLocalizationPromptKey"
          options={prompts.map((prompt) => ({
            label: `${prompt.isDefault ? "[default] " : ""}${prompt.title} (${prompt.variant})`,
            value: prompt.key,
          }))}
          placeholder="Use default prompt"
          value={defaultPrompt?.key}
        />
        {!prompts.length ? (
          <p className="-mt-2 text-xs leading-5 text-red-300">
            No enabled prompts are available for this task.
          </p>
        ) : null}
        <PromptSelect
          label="Batch translation prompt"
          name="youtubeLocalizationBatchPromptKey"
          options={batchPrompts.map((prompt) => ({
            label: `${prompt.isDefault ? "[default] " : ""}${prompt.title} (${prompt.variant})`,
            value: prompt.key,
          }))}
          placeholder="Use default batch prompt"
          value={defaultBatchPrompt?.key}
        />
        {!batchPrompts.length ? (
          <p className="-mt-2 text-xs leading-5 text-red-300">
            No enabled batch prompts are available for this task.
          </p>
        ) : null}
        {!youtubeId ? (
          <p className="-mt-2 text-xs leading-5 text-red-300">
            YouTube ID is required before generating YouTube copy.
          </p>
        ) : null}
        <PromptTextarea
          label="Generation notes"
          name="generationNotes"
          rows={4}
          value=""
        />
        <p className="-mt-2 text-xs leading-5 text-zinc-500">
          The selected primary language is sent as the target language and is
          not saved separately.
        </p>
        <div className="flex justify-end">
          <div className="grid gap-2">
            <AdminGenerateYoutubeLocalizationButton
              className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
              contentId={contentId}
              disabled={disabled}
            />
            <AdminGenerateYoutubeLocalizationBatchButton
              className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
              contentId={contentId}
              disabled={batchDisabled}
            />
          </div>
        </div>
      </AiActionsDrawer>
      <ActionsDrawer>
        <AdminSyncYoutubeVideoButton
          className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
          contentId={contentId}
          disabled={!youtubeId}
          labels={localeLabels}
          locales={locales}
        />
      </ActionsDrawer>
    </>
  );
}

function SubtitleAiActions({
  contentId,
  locales,
  prompts,
  youtubeId,
}: {
  contentId: string;
  locales: readonly string[];
  prompts: AdminPromptOption[];
  youtubeId?: string | null;
}) {
  const defaultPrompt = prompts.find((prompt) => prompt.isDefault);
  const disabled = !prompts.length;

  return (
    <>
      <AiActionsDrawer
        description="Use the primary SRT subtitle track as source and translate it into every other subtitle language."
        title="Translate subtitles"
      >
        <PromptSelect
          label="Batch subtitle prompt"
          name="subtitleLocalizationBatchPromptKey"
          options={prompts.map((prompt) => ({
            label: `${prompt.isDefault ? "[default] " : ""}${prompt.title} (${prompt.variant})`,
            value: prompt.key,
          }))}
          placeholder="Use default subtitle prompt"
          value={defaultPrompt?.key}
        />
        {!prompts.length ? (
          <p className="-mt-2 text-xs leading-5 text-red-300">
            No enabled subtitle batch prompts are available for this task.
          </p>
        ) : null}
        <PromptTextarea
          label="Generation notes"
          name="subtitleGenerationNotes"
          rows={4}
          value=""
        />
        <p className="-mt-2 text-xs leading-5 text-zinc-500">
          The selected primary subtitle language is used as source. Generated
          SRT is applied to the form first and is not saved until you save
          subtitles.
        </p>
        <div className="flex justify-end">
          <AdminGenerateSubtitleLocalizationBatchButton
            className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
            contentId={contentId}
            disabled={disabled}
          />
        </div>
      </AiActionsDrawer>
      <ActionsDrawer>
        <AdminDownloadSubtitlesButton
          className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium`}
          contentId={contentId}
          locales={locales}
        />
        {!youtubeId ? (
          <p className="-mt-1 text-xs leading-5 text-red-300">
            YouTube ID is required before syncing subtitles to YouTube.
          </p>
        ) : null}
        <AdminSyncYoutubeCaptionsButton
          className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
          contentId={contentId}
          disabled={!youtubeId}
          locales={locales}
        />
      </ActionsDrawer>
    </>
  );
}

function PlatformAiActions({
  apiPath,
  contentId,
  description,
  descriptionFieldName,
  disabledReason,
  generateLabel,
  prompts,
  tagsFieldName,
  title,
  titleFieldName,
  youtubeId,
}: {
  apiPath:
    | "generate-bilibili-copy"
    | "generate-pixiv-copy"
    | "generate-vk-copy";
  contentId: string;
  description: string;
  descriptionFieldName: string;
  disabledReason: string;
  generateLabel: string;
  prompts: AdminPromptOption[];
  tagsFieldName?: string;
  title: string;
  titleFieldName: string;
  youtubeId?: string | null;
}) {
  const defaultPrompt = prompts.find((prompt) => prompt.isDefault);
  const disabled = !prompts.length || !youtubeId;

  return (
    <AiActionsDrawer description={description} title={title}>
      <PromptSelect
        label="Prompt"
        name="platformCopyPromptKey"
        options={prompts.map((prompt) => ({
          label: `${prompt.isDefault ? "[default] " : ""}${prompt.title} (${prompt.variant})`,
          value: prompt.key,
        }))}
        placeholder="Use default prompt"
        value={defaultPrompt?.key}
      />
      {!prompts.length ? (
        <p className="-mt-2 text-xs leading-5 text-red-300">
          No enabled prompts are available for this task.
        </p>
      ) : null}
      {!youtubeId ? (
        <p className="-mt-2 text-xs leading-5 text-red-300">{disabledReason}</p>
      ) : null}
      <PromptTextarea
        label="Generation notes"
        name="generationNotes"
        rows={4}
        value=""
      />
      <p className="-mt-2 text-xs leading-5 text-zinc-500">
        These notes are sent to the model as input and are not saved.
      </p>
      <div className="flex justify-end">
        <AdminGeneratePlatformCopyButton
          apiPath={apiPath}
          className={`${SECONDARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60`}
          contentId={contentId}
          descriptionFieldName={descriptionFieldName}
          disabled={disabled}
          label={generateLabel}
          tagsFieldName={tagsFieldName}
          titleFieldName={titleFieldName}
        />
      </div>
    </AiActionsDrawer>
  );
}

function AiActionsDrawer({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <aside className="pointer-events-none fixed top-28 right-0 z-40">
      <details className="group pointer-events-auto w-12 overflow-hidden rounded-l-md border border-r-0 border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-2xl shadow-black/30 backdrop-blur transition-[width] open:w-[min(380px,calc(100vw-1rem))]">
        <summary className="relative flex h-40 w-12 cursor-pointer select-none list-none items-center justify-center gap-2 p-3 marker:hidden group-open:h-auto group-open:w-full group-open:items-start group-open:justify-start group-open:p-4 group-open:pr-12 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 [writing-mode:vertical-rl] group-open:[writing-mode:horizontal-tb]">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium uppercase text-zinc-400">
              AI Actions
            </span>
          </span>
          <span className="hidden group-open:block">
            <span className="block text-base font-semibold text-zinc-100">
              {title}
            </span>
            <span className="mt-1 block text-sm leading-6 text-zinc-400">
              {description}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="absolute top-4 right-4 hidden h-7 w-7 place-items-center rounded-md border border-zinc-700 text-zinc-400 transition-colors group-open:grid group-hover:border-zinc-500 group-hover:text-zinc-100"
          >
            <ArrowRightToLine className="h-4 w-4" />
          </span>
        </summary>
        <div className="grid gap-4 border-t border-zinc-800 p-4">
          {children}
        </div>
      </details>
    </aside>
  );
}

function ActionsDrawer({ children }: { children: ReactNode }) {
  return (
    <aside className="pointer-events-none fixed top-[19rem] right-0 z-40">
      <details className="group pointer-events-auto w-12 overflow-hidden rounded-l-md border border-r-0 border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-2xl shadow-black/30 backdrop-blur transition-[width] open:w-[min(380px,calc(100vw-1rem))]">
        <summary className="relative flex h-32 w-12 cursor-pointer select-none list-none items-center justify-center p-3 marker:hidden group-open:h-auto group-open:w-full group-open:justify-start group-open:p-4 group-open:pr-12 [&::-webkit-details-marker]:hidden">
          <span className="text-xs font-medium uppercase text-zinc-400 [writing-mode:vertical-rl] group-open:[writing-mode:horizontal-tb]">
            Actions
          </span>
          <span
            aria-hidden="true"
            className="absolute top-3 right-4 hidden h-7 w-7 place-items-center rounded-md border border-zinc-700 text-zinc-400 transition-colors group-open:grid group-hover:border-zinc-500 group-hover:text-zinc-100"
          >
            <ArrowRightToLine className="h-4 w-4" />
          </span>
        </summary>
        <div className="grid gap-4 border-t border-zinc-800 p-4">
          {children}
        </div>
      </details>
    </aside>
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
            ? `${subtitleTrackCount} subtitle locale(s) ready`
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
    work?.pixivTitle || work?.pixivDescription || work?.pixivTags
      ? "Pixiv copy"
      : null,
  ].filter(Boolean);
  const youtubeLocales = getFilledYoutubeLocalizationLocales(work);

  if (youtubeLocales.length > 0) {
    items.push(`YouTube copy: ${youtubeLocales.join(", ")}`);
  }

  return {
    complete: items.length > 0,
    value: items.length > 0 ? items.join(" · ") : "Empty",
  };
}

function MusicWorkForm({
  bilibiliPrompts,
  currentStep,
  descriptionPrompts,
  pixivPrompts,
  relatedPrompts,
  subtitleBatchPrompts,
  vkPrompts,
  work,
  youtubeBatchPrompts,
  youtubeLocaleConfig,
  youtubePrompts,
  youtubePublicationStatus,
}: {
  bilibiliPrompts: AdminPromptOption[];
  currentStep: AdminEditorStep;
  descriptionPrompts: AdminPromptOption[];
  pixivPrompts: AdminPromptOption[];
  relatedPrompts: AdminPromptOption[];
  subtitleBatchPrompts: AdminPromptOption[];
  vkPrompts: AdminPromptOption[];
  work?: AdminMusicWork;
  youtubeBatchPrompts: AdminPromptOption[];
  youtubeLocaleConfig: AdminYoutubeLocaleOption[];
  youtubePrompts: AdminPromptOption[];
  youtubePublicationStatus: YouTubePublicationStatus;
}) {
  const youtubeEditorLocaleOptions = getYoutubeEditorLocaleOptions(
    youtubeLocaleConfig,
    work,
  );
  const youtubeLocales = youtubeEditorLocaleOptions.map(
    (option) => option.locale,
  );
  const youtubeLocaleLabels = Object.fromEntries(
    youtubeEditorLocaleOptions.map((option) => [option.locale, option.label]),
  );
  const youtubeReadyLocales = youtubeLocales.filter((locale) =>
    isYoutubeLocalizationFilled(work, locale),
  );
  const subtitleReadyLocales = youtubeLocales.filter((locale) =>
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
                warning="id"
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
          <Section id="description" index={5} title="Description">
            <div className="grid gap-4">
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
              <div className="flex justify-end">
                <Button className={PRIMARY_BUTTON_CLASS} type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save description
                </Button>
              </div>
            </div>
            {work ? (
              <DescriptionAiActions
                contentId={work.contentId}
                prompts={descriptionPrompts}
              />
            ) : null}
          </Section>
        </StepForm>
      );
    case "lyrics":
      return (
        <StepForm step="lyrics" work={work}>
          <Section id="lyrics" index={4} title="Lyrics">
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
            <div className="grid gap-4">
              <TextArea
                label="Related content UIDs"
                name="relatedWorkUids"
                placeholder={"251\n2o1\nmusic-work-uid"}
                rows={4}
                value={work?.relatedWorkUids}
              />
              <p className="-mt-2 text-xs leading-5 text-zinc-500">
                Use one UID per line. Commas, spaces, and pasted lists are also
                accepted and will be saved as a newline list.
              </p>
              <StepSaveButton label="Save related" />
            </div>
            {work ? (
              <RelatedAiActions
                contentId={work.contentId}
                prompts={relatedPrompts}
              />
            ) : null}
          </Section>
        </StepForm>
      );
    case "subtitles":
      return (
        <StepForm step="subtitles" work={work}>
          <Section id="subtitles" index={11} title="Subtitles">
            <AdminLocalePanels
              initialPrimaryLocale={work?.subtitlePrimaryLocale ?? "ru"}
              labels={youtubeLocaleLabels}
              locales={youtubeLocales}
              primaryLocaleInputName="subtitlePrimaryLocale"
              readyLocales={subtitleReadyLocales}
            >
              {youtubeLocales.map((locale) => (
                <div data-locale={locale} key={locale}>
                  <SubtitleEditor locale={locale} work={work} />
                </div>
              ))}
            </AdminLocalePanels>
            {work ? (
              <SubtitleAiActions
                contentId={work.contentId}
                locales={youtubeLocales}
                prompts={subtitleBatchPrompts}
                youtubeId={work.u2bId}
              />
            ) : null}
            <StepSaveButton label="Save subtitles" />
          </Section>
        </StepForm>
      );
    case "youtube":
      return (
        <StepForm step="youtube" work={work}>
          <Section id="youtube" index={7} title="YouTube">
            <DistributionPanel title="YouTube">
              <Field
                label="YouTube ID"
                name="u2bId"
                value={work?.u2bId}
                warning="id"
              />
              <AdminLocalePanels
                initialPrimaryLocale={work?.youtubePrimaryLocale ?? "en"}
                labels={youtubeLocaleLabels}
                locales={youtubeLocales}
                primaryLocaleInputName="youtubePrimaryLocale"
                readyLocales={youtubeReadyLocales}
              >
                {youtubeLocales.map((locale) => (
                  <div data-locale={locale} key={locale}>
                    <YoutubeEditor locale={locale} work={work} />
                  </div>
                ))}
              </AdminLocalePanels>
            </DistributionPanel>
            {work ? (
              <YoutubeAiActions
                batchPrompts={youtubeBatchPrompts}
                contentId={work.contentId}
                localeLabels={youtubeLocaleLabels}
                locales={youtubeLocales}
                prompts={youtubePrompts}
                youtubeId={work.u2bId}
              />
            ) : null}
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
                warning="id"
              />
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <PlatformReference
                  content={getFirstYoutubeLocalizationContent(work, [
                    "zh",
                    "zh-CN",
                    "zh-Hans",
                  ])}
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
            {work ? (
              <PlatformAiActions
                apiPath="generate-bilibili-copy"
                contentId={work.contentId}
                description="Use metadata, source, lyrics, description, related works, and Chinese YouTube copy to generate BiliBili title and description."
                descriptionFieldName="bilibiliDescription"
                disabledReason="YouTube ID is required before generating BiliBili copy."
                generateLabel="Generate BiliBili copy"
                prompts={bilibiliPrompts}
                title="Generate BiliBili copy"
                titleFieldName="bilibiliTitle"
                youtubeId={work.u2bId}
              />
            ) : null}
            <StepSaveButton label="Save BiliBili" />
          </Section>
        </StepForm>
      );
    case "vk":
      return (
        <StepForm step="vk" work={work}>
          <Section id="vk" index={9} title="VK Video">
            <DistributionPanel title="VK Video">
              <Field
                label="VK ID"
                name="vkId"
                value={work?.vkId}
                warning="id"
              />
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <PlatformReference
                  content={getFirstYoutubeLocalizationContent(work, [
                    "ru",
                    "ru-RU",
                  ])}
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
            {work ? (
              <PlatformAiActions
                apiPath="generate-vk-copy"
                contentId={work.contentId}
                description="Use metadata, source, lyrics, description, related works, and Russian YouTube copy to generate VK title and description."
                descriptionFieldName="vkDescription"
                disabledReason="YouTube ID is required before generating VK copy."
                generateLabel="Generate VK copy"
                prompts={vkPrompts}
                title="Generate VK copy"
                titleFieldName="vkTitle"
                youtubeId={work.u2bId}
              />
            ) : null}
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
                warning="id"
              />
              <PlatformTextFields
                descriptionName="pixivDescription"
                descriptionValue={work?.pixivDescription}
                titleName="pixivTitle"
                titleValue={work?.pixivTitle}
              />
              <Field
                label="Tags"
                name="pixivTags"
                placeholder="#ComradeSovia, #anime, #song"
                value={work?.pixivTags}
              />
            </DistributionPanel>
            {work ? (
              <PlatformAiActions
                apiPath="generate-pixiv-copy"
                contentId={work.contentId}
                description="Use metadata, source, lyrics, description, related works, and English YouTube copy to generate Pixiv title, description, and tags."
                descriptionFieldName="pixivDescription"
                disabledReason="YouTube ID is required before generating Pixiv copy."
                generateLabel="Generate Pixiv copy"
                prompts={pixivPrompts}
                tagsFieldName="pixivTags"
                title="Generate Pixiv copy"
                titleFieldName="pixivTitle"
                youtubeId={work.u2bId}
              />
            ) : null}
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
  locale: string;
  work?: AdminMusicWork;
}) {
  const content = getYoutubeLocalizationContent(work, locale);
  const filled = isYoutubeLocalizationFilled(work, locale);
  const titleFieldName = `youtubeLocalization.${locale}.title`;
  const descriptionFieldName = `youtubeLocalization.${locale}.description`;

  return (
    <section
      className="scroll-mt-5 rounded-md border border-zinc-800 bg-zinc-950 p-4"
      id={`youtube-localization-${locale}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-100">
            {getYoutubeLocaleLabel(locale)}
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
          name={titleFieldName}
          value={content.title}
        />
        <TextArea
          label="YouTube description"
          name={descriptionFieldName}
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
  locale: string;
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
            {getYoutubeLocaleLabel(locale)}
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
  locale: string,
) {
  return work?.youtubeLocalization?.[locale] ?? {};
}

function getFirstYoutubeLocalizationContent(
  work: AdminMusicWork | undefined,
  locales: string[],
) {
  for (const locale of locales) {
    const content = getYoutubeLocalizationContent(work, locale);
    if (content.title || content.description) {
      return content;
    }
  }

  return {};
}

function isYoutubeLocalizationFilled(
  work: AdminMusicWork | undefined,
  locale: string,
) {
  const content = getYoutubeLocalizationContent(work, locale);
  return Boolean(content.title || content.description);
}

function getFilledYoutubeLocalizationLocales(work: AdminMusicWork | undefined) {
  return Object.keys(work?.youtubeLocalization ?? {}).filter((locale) =>
    isYoutubeLocalizationFilled(work, locale),
  );
}

function getYoutubeEditorLocaleOptions(
  configuredLocales: AdminYoutubeLocaleOption[],
  work: AdminMusicWork | undefined,
) {
  const options = configuredLocales.map((locale) => ({
    label: locale.label,
    locale: locale.locale,
  }));
  const configuredSet = new Set(options.map((option) => option.locale));

  for (const locale of getFilledYoutubeLocalizationLocales(work)) {
    if (!configuredSet.has(locale)) {
      options.push({
        label: getYoutubeLocaleLabel(locale),
        locale,
      });
    }
  }

  return options.length
    ? options
    : [
        {
          label: getYoutubeLocaleLabel("en"),
          locale: "en",
        },
      ];
}

function getYoutubeLocaleLabel(locale: string) {
  return (SITE_LOCALE_LABELS as Record<string, string>)[locale] ?? locale;
}

function Field({
  label,
  name,
  placeholder,
  readOnly,
  required,
  type = "text",
  value,
  warning,
}: {
  label: string;
  name: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  type?: string;
  value?: string | null;
  warning?: "id";
}) {
  return (
    <div className={FIELD_STATE_CLASS} data-admin-db-field-name={name}>
      <FieldLabel copyName={name} label={label} />
      <Input
        className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
        data-admin-warning={warning}
        defaultValue={value ?? ""}
        key={name}
        name={name}
        placeholder={placeholder}
        readOnly={readOnly}
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
    <div className={FIELD_STATE_CLASS} data-admin-db-field-name={name}>
      <Label
        className="flex items-center justify-between gap-2 text-xs font-medium normal-case tracking-normal text-zinc-300"
        htmlFor={id}
      >
        <span>{label}</span>
        <FieldStatus />
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
    <div
      className={FIELD_STATE_CLASS}
      data-admin-db-field-name={name}
      data-admin-initial-value={value ?? ""}
    >
      <FieldLabel copyName={name} label={label} />
      <select
        className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        defaultValue={value ?? ""}
        key={name}
        name={name}
        required={required}
        suppressHydrationWarning
      >
        {placeholder ? (
          <option disabled value="">
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  label,
  name,
  placeholder,
  rows = 8,
  value,
}: {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
  value?: string | null;
}) {
  return (
    <div className={FIELD_STATE_CLASS} data-admin-db-field-name={name}>
      <FieldLabel copyName={name} label={label} />
      <Textarea
        className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-zinc-500"
        defaultValue={value ?? ""}
        key={name}
        name={name}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function FieldLabel({ copyName, label }: { copyName?: string; label: string }) {
  return (
    <Label className="flex items-center justify-between gap-2 text-xs font-medium normal-case tracking-normal text-zinc-300">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        {copyName ? <AdminCopyFieldButton name={copyName} /> : null}
        <FieldStatus />
      </span>
    </Label>
  );
}

function FieldStatus() {
  return (
    <span
      className="rounded-sm bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-500 group-data-[field-state=changed]:bg-yellow-400/10 group-data-[field-state=changed]:text-yellow-200 group-data-[field-state=database]:bg-sky-500/10 group-data-[field-state=database]:text-sky-200 group-data-[field-state=empty]:bg-zinc-800 group-data-[field-state=empty]:text-zinc-400 group-data-[field-state=invalid]:bg-red-500/10 group-data-[field-state=invalid]:text-red-200 group-data-[field-state=warning]:bg-orange-500/10 group-data-[field-state=warning]:text-orange-200"
      data-admin-field-status
    />
  );
}
