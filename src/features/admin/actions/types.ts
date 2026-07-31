export type AdminActionInputType =
  | "checkbox"
  | "content"
  | "json"
  | "prompt"
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
    pageSteps?: readonly string[];
  };
  closeOn?: readonly AdminActionCloseEvent[];
  description: string;
  execution: {
    batch?: {
      inputKey: string;
      outputKey: string;
      strategy: "subtitle-localizations";
    };
    endpoint: string;
    formContext?: "subtitle-translation" | "youtube-captions" | "youtube-sync";
    method: "POST";
    type: "form" | "http";
  };
  id: string;
  inputs: readonly AdminActionInput[];
  output: AdminActionOutput;
  presentation: AdminActionPresentation;
  scope: "content" | "global";
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
