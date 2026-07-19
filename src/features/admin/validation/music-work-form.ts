import { z } from "zod";

export const MUSIC_WORK_STEPS = [
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

export type MusicWorkStep = (typeof MUSIC_WORK_STEPS)[number];

export const WORK_TYPES = ["O", "CO", "R", "LC", "C"] as const;
export const FROM_TYPES = ["Original", "Anime", "Game", "Pop", "Meme"] as const;

const stepSchema = z.enum(MUSIC_WORK_STEPS, {
  error: "Invalid editor step. Refresh the page and try again.",
});

const workTypeSchema = z.enum(WORK_TYPES, {
  error: "Work type must be O, CO, R, LC, or C.",
});

const fromTypeSchema = z.enum(FROM_TYPES, {
  error: "From type must be Original, Anime, Game, Pop, or Meme.",
});

const trimmedRequired = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

const trimmedOptional = z
  .string()
  .trim()
  .transform((value) => (value ? value : undefined))
  .optional();

const urlOptional = (label: string) =>
  trimmedOptional.refine(
    (value) => !value || /^https?:\/\/\S+$/i.test(value),
    `${label} must be a valid http(s) URL.`,
  );

const dateOptional = trimmedOptional.refine(
  (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "Published date must use YYYY-MM-DD.",
);

const metadataSchema = z.object({
  contentId: trimmedRequired("Content ID"),
  path: trimmedOptional,
  songTitle: trimmedOptional,
  workType: workTypeSchema,
});

const statusSchema = z.object({
  publishedAt: dateOptional,
  visible: z.boolean(),
});

const fromSchema = z.object({
  fromArtists: trimmedOptional,
  fromDetails: trimmedOptional,
  fromIp: trimmedOptional,
  fromSeries: trimmedOptional,
  fromSession: trimmedOptional,
  fromSource: urlOptional("Source"),
  fromTitle: trimmedOptional,
  fromType: fromTypeSchema.optional(),
});

const descriptionSchema = z.object({
  introText: z.string(),
  productionNotes: z.string(),
  shortDescription: trimmedOptional,
});

const lyricsSchema = z.object({
  lyrics: z.string(),
});

const relatedSchema = z.object({
  relatedWorkUids: trimmedOptional,
});

const youtubeSchema = z.object({
  u2bId: trimmedOptional,
});

const bilibiliSchema = z.object({
  bilibiliDescription: trimmedOptional,
  bilibiliId: trimmedOptional,
  bilibiliTitle: trimmedOptional,
});

const vkSchema = z.object({
  vkDescription: trimmedOptional,
  vkId: trimmedOptional,
  vkTitle: trimmedOptional,
});

const pixivSchema = z.object({
  pixivDescription: trimmedOptional,
  pixivId: trimmedOptional,
  pixivTags: trimmedOptional,
  pixivTitle: trimmedOptional,
});

const subtitlesSchema = z.object({});

const stepSchemas = {
  bilibili: bilibiliSchema,
  description: descriptionSchema,
  from: fromSchema,
  lyrics: lyricsSchema,
  metadata: metadataSchema,
  pixiv: pixivSchema,
  related: relatedSchema,
  status: statusSchema,
  subtitles: subtitlesSchema,
  vk: vkSchema,
  youtube: youtubeSchema,
} satisfies Record<MusicWorkStep, z.ZodType>;

export function parseMusicWorkStep(value: string) {
  return stepSchema.parse(value);
}

export function assertValidMusicWorkStepForm(
  step: MusicWorkStep,
  value: unknown,
) {
  const result = stepSchemas[step].safeParse(value);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
}

export function assertValidFullMusicWorkForm(value: unknown) {
  const result = z
    .object({
      ...metadataSchema.shape,
      ...statusSchema.shape,
      ...fromSchema.shape,
      ...descriptionSchema.shape,
      ...lyricsSchema.shape,
      ...relatedSchema.shape,
      ...youtubeSchema.shape,
      ...bilibiliSchema.shape,
      ...vkSchema.shape,
      ...pixivSchema.shape,
    })
    .safeParse(value);

  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const field = issue.path.join(".");
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .join("\n");
}
