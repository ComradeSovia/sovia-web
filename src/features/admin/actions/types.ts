export type AdminActionInputType =
  | "checkbox"
  | "content"
  | "hidden"
  | "json"
  | "prompt"
  | "select"
  | "text"
  | "textarea"
  | "subtitleLocales"
  | "subtitleLocale"
  | "youtubeLocales"
  | "youtubeLocale";

export type AdminActionInput = {
  allowDefault?: boolean;
  defaultFromFormField?: string;
  defaultFromSubtitleForm?: boolean;
  defaultOptionLabel?: string;
  description?: string;
  key: string;
  label: string;
  maxUrlLength?: number;
  options?: readonly { label: string; value: string }[];
  promptTask?: string;
  required?: boolean;
  selectAllByDefault?: boolean;
  type: AdminActionInputType;
  url?: "omit" | "sync";
  urlKey?: string;
  excludeInputKey?: string;
};

export type AdminActionRunStatus =
  | "failed"
  | "idle"
  | "running"
  | "saved"
  | "saving"
  | "succeeded"
  | "validating";

export type AdminActionFormOutputTarget =
  | "bilibili"
  | "description"
  | "pixiv"
  | "related"
  | "subtitles"
  | "vk"
  | "youtube"
  | "youtubeBatch";

export type AdminActionOutput = {
  applyToForm?: AdminActionFormOutputTarget;
  mode: "none" | "preview";
  save?: {
    target:
      | "bilibili"
      | "description"
      | "pixiv"
      | "related"
      | "subtitles"
      | "vk";
  };
};

export type AdminActionCompletionEffect =
  | { message: string; type: "toast" }
  | { target: string; type: "consume-output" }
  | { type: "refresh-context" }
  | { path: string; type: "navigate-output"; valueKey: string }
  | { href: string; type: "navigate" };

export type AdminActionPresentation =
  | { type: "standard" }
  | { confirmation: string; type: "confirm" }
  | { view: string; type: "custom" | "wizard" };

export type AdminActionCloseEvent = "applied" | "completed" | "saved";

export type AdminActionDefinition = {
  after?: Partial<
    Record<
      "onCompleted" | "onFailed" | "onSaved",
      readonly AdminActionCompletionEffect[]
    >
  >;
  availability: {
    contextualOnly?: boolean;
    pageSteps?: readonly string[];
  };
  closeOn?: readonly AdminActionCloseEvent[];
  description: string;
  execution: {
    batch?: {
      inputKey: string;
      outputKey: string;
      strategy: "subtitle-localizations" | "youtube-localizations";
    };
    endpoint: string;
    formContext?:
      | "subtitle-translation"
      | "youtube-captions"
      | "youtube-sync"
      | "youtube-translation";
    method: "POST";
    type: "form" | "http";
  };
  executeLabel?: string;
  id: string;
  inputs: readonly AdminActionInput[];
  output: AdminActionOutput;
  presentation: AdminActionPresentation;
  scope: "content" | "global" | "todo";
  title: string;
  type: "ai" | "default";
};

export type AdminActionInputValues = Record<string, string | boolean>;

export type AdminActionRun = {
  actionId: string;
  error?: string;
  input: AdminActionInputValues;
  output?: unknown;
  status: AdminActionRunStatus;
};
