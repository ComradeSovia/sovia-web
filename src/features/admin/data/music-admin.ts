import {
  checkMusicDatabaseConnection,
  clearMusicWorkStepData,
  deleteMusicWorkByContentId,
  ensureMusicDatabase,
  getMusicWorkByPath,
  listMusicWorkOptions,
  listMusicWorksWithContent,
  upsertMusicWork,
} from "@sovia/sound/data/music-repository";
import type { MusicWorkDraft } from "@sovia/sound/model/music";

type ActionOutputTarget =
  | "bilibili"
  | "description"
  | "pixiv"
  | "related"
  | "subtitles"
  | "vk";

export function initializeMusicDatabase() {
  ensureMusicDatabase();
}

export async function listAdminMusicWorks() {
  return listMusicWorksWithContent();
}

export async function listAdminMusicWorkOptions() {
  return listMusicWorkOptions();
}

export async function getAdminMusicWork(id: string) {
  return getMusicWorkByPath(id);
}

export async function getAdminDatabaseStatus() {
  return checkMusicDatabaseConnection();
}

export async function saveMusicWork({
  currentContentId,
  work,
}: {
  currentContentId?: string;
  work: MusicWorkDraft;
}) {
  initializeMusicDatabase();
  await upsertMusicWork(work, currentContentId);
}

export async function deleteMusicWork(contentId: string) {
  initializeMusicDatabase();
  await deleteMusicWorkByContentId(contentId);
}

export async function clearMusicWorkStep(contentId: string, step: string) {
  initializeMusicDatabase();
  await clearMusicWorkStepData(contentId, step);
}

export async function saveAdminActionOutput({
  contentId,
  output,
  target,
}: {
  contentId: string;
  output: unknown;
  target: ActionOutputTarget;
}) {
  const work = await getAdminMusicWork(contentId);
  if (!work) throw new Error("Content record could not be loaded.");
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("Action output is invalid.");
  }

  const value = output as Record<string, unknown>;
  const draft: MusicWorkDraft = { ...work };

  switch (target) {
    case "description":
      draft.shortDescription = getRequiredOutputString(
        value,
        "shortDescription",
      );
      draft.introText = getRequiredOutputString(value, "introText");
      draft.productionNotes = getRequiredOutputString(value, "productionNotes");
      break;
    case "related":
      draft.relatedWorkUids = mergeRelatedWorkUids(
        draft.relatedWorkUids,
        getRelatedOutput(value),
      ).join("\n");
      break;
    case "subtitles":
      draft.subtitleTracks = {
        ...(draft.subtitleTracks ?? {}),
        ...getSubtitleOutput(value),
      };
      break;
    case "bilibili":
      draft.bilibiliTitle = getRequiredOutputString(value, "title");
      draft.bilibiliDescription = getRequiredOutputString(value, "description");
      break;
    case "vk":
      draft.vkTitle = getRequiredOutputString(value, "title");
      draft.vkDescription = getRequiredOutputString(value, "description");
      break;
    case "pixiv":
      draft.pixivTitle = getRequiredOutputString(value, "title");
      draft.pixivDescription = getRequiredOutputString(value, "description");
      draft.pixivTags = getOutputTags(value).join(", ");
      break;
  }

  await saveMusicWork({ currentContentId: work.contentId, work: draft });
}

function getRequiredOutputString(output: Record<string, unknown>, key: string) {
  const value = output[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Action output field "${key}" is missing.`);
  }
  return value.trim();
}

function getRelatedOutput(output: Record<string, unknown>) {
  const candidates = output.candidates;
  if (!Array.isArray(candidates)) {
    throw new Error("Related action output is missing candidates.");
  }

  const ids = candidates
    .map((candidate) =>
      candidate && typeof candidate === "object" && "uid" in candidate
        ? (candidate as { uid?: unknown }).uid
        : undefined,
    )
    .filter((uid): uid is string => typeof uid === "string" && Boolean(uid));

  if (!ids.length) throw new Error("Related action output has no content IDs.");
  return Array.from(new Set(ids));
}

function mergeRelatedWorkUids(
  currentValue: string | null | undefined,
  additions: string[],
) {
  const merged = currentValue
    ? currentValue
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  for (const value of additions) {
    if (!merged.includes(value)) merged.push(value);
  }
  return merged;
}

function getOutputTags(output: Record<string, unknown>) {
  const tags = output.tags;
  if (!Array.isArray(tags))
    throw new Error("Pixiv action output is missing tags.");
  const values = tags.filter(
    (tag): tag is string => typeof tag === "string" && Boolean(tag.trim()),
  );
  if (!values.length) throw new Error("Pixiv action output has no tags.");
  return values.map((tag) => tag.trim());
}

function getSubtitleOutput(output: Record<string, unknown>) {
  const localizations = output.localizations;
  if (!Array.isArray(localizations)) {
    throw new Error("Subtitle action output is missing localizations.");
  }

  const tracks = Object.fromEntries(
    localizations.flatMap((localization) => {
      if (!localization || typeof localization !== "object") return [];
      const value = localization as { locale?: unknown; srt?: unknown };
      if (
        typeof value.locale !== "string" ||
        !value.locale.trim() ||
        typeof value.srt !== "string" ||
        !value.srt.trim()
      ) {
        return [];
      }
      return [[value.locale, value.srt] as const];
    }),
  );

  if (!Object.keys(tracks).length) {
    throw new Error("Subtitle action output has no subtitle tracks.");
  }
  return tracks;
}
