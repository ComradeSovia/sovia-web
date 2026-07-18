export const ADMIN_EDITOR_STEPS = [
  "metadata",
  "status",
  "from",
  "lyrics",
  "description",
  "related",
  "youtube",
  "bilibili",
  "vk",
  "pixiv",
  "subtitles",
] as const;

export type AdminEditorStep = (typeof ADMIN_EDITOR_STEPS)[number];

export const DEFAULT_ADMIN_EDITOR_STEP: AdminEditorStep = "metadata";

export function matchAdminEditorStep(value?: string | null): AdminEditorStep {
  if (ADMIN_EDITOR_STEPS.includes(value as AdminEditorStep)) {
    return value as AdminEditorStep;
  }

  return DEFAULT_ADMIN_EDITOR_STEP;
}
