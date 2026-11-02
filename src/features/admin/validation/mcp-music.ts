import { z } from "zod";

const shortText = z.string().max(2000).nullable();
const longText = z.string().max(100000).nullable();
const locale = z
  .string()
  .regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/)
  .max(40);
const localeMap = <T extends z.ZodType>(value: T) =>
  z
    .record(locale, value)
    .refine((map) => Object.keys(map).length <= 100, "Too many locales.");
const localization = z
  .object({
    title: z.string().max(1000).nullable().optional(),
    description: longText.optional(),
  })
  .strict();

export const mcpMusicPatchSchema = z
  .object({
    songTitle: z.string().trim().min(1).max(500).optional(),
    path: z
      .string()
      .regex(/^[\p{L}\p{N}_-]+$/u)
      .max(160)
      .nullable()
      .optional(),
    workType: z.enum(["O", "CO", "R", "LC", "C"]).optional(),
    visible: z.boolean().optional(),
    publishedAt: z.iso.date().nullable().optional(),
    vocalLanguages: z.array(locale).max(30).optional(),
    durationSeconds: z
      .number()
      .int()
      .positive()
      .max(604800)
      .nullable()
      .optional(),
    lyrics: longText.optional(),
    shortDescription: shortText.optional(),
    introText: longText.optional(),
    productionNotes: longText.optional(),
    fromTitle: shortText.optional(),
    fromArtists: z.array(z.string().max(500)).max(100).optional(),
    fromType: z
      .enum([
        "Original",
        "Anime",
        "Cartoon",
        "Game",
        "Movie",
        "TV Series",
        "Traditional",
        "Pop",
        "Meme",
      ])
      .nullable()
      .optional(),
    fromSource: z
      .url()
      .refine((url) => /^https?:/.test(url), "Only HTTP(S) URLs are supported.")
      .nullable()
      .optional(),
    fromIp: shortText.optional(),
    fromSeries: shortText.optional(),
    fromSession: shortText.optional(),
    fromDetails: longText.optional(),
    relatedWorkUids: z.array(z.string().min(1).max(160)).max(100).optional(),
    u2bId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{11}$/)
      .nullable()
      .optional(),
    youtubePrimaryLocale: locale.nullable().optional(),
    subtitlePrimaryLocale: locale.nullable().optional(),
    youtubeLocalization: localeMap(localization.nullable()).optional(),
    subtitleTracks: localeMap(longText).optional(),
    bilibiliId: shortText.optional(),
    bilibiliTitle: shortText.optional(),
    bilibiliDescription: longText.optional(),
    vkId: shortText.optional(),
    vkTitle: shortText.optional(),
    vkDescription: longText.optional(),
    pixivId: shortText.optional(),
    pixivTitle: shortText.optional(),
    pixivDescription: longText.optional(),
    pixivTags: z.array(z.string().max(200)).max(100).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field to update.",
  );

const common = {
  requestId: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
  confirmWrite: z.literal(true),
};
export const mcpUpdateMusicSchema = z
  .object({
    ...common,
    contentId: z.string().min(1).max(160),
    expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
    patch: mcpMusicPatchSchema,
  })
  .strict();
export const mcpCreateMusicSchema = z
  .object({
    ...common,
    contentId: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .max(160),
    patch: mcpMusicPatchSchema.refine(
      (value) => Boolean(value.songTitle && value.workType),
      "songTitle and workType are required for creation.",
    ),
  })
  .strict();
export type McpMusicPatch = z.infer<typeof mcpMusicPatchSchema>;

export function mergeMcpLocaleMap(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  const next = { ...current };
  for (const [locale, value] of Object.entries(patch)) {
    if (value === null) delete next[locale];
    else
      next[locale] =
        typeof value === "object" && value !== null && !Array.isArray(value)
          ? {
              ...(typeof next[locale] === "object" && next[locale] !== null
                ? next[locale]
                : {}),
              ...value,
            }
          : value;
  }
  return next;
}
