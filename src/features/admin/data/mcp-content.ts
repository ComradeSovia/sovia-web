import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  CONTENT_TYPES,
  FROM_TYPES,
  WORK_TYPES,
} from "../validation/music-work-form";
import { getAdminUrl } from "./admin-url";
import { writeAudit } from "./review-audit";
import { getReviewClient, isReviewTransaction } from "./review-transaction";

const text = (max: number) => z.string().max(max).nullable().optional();
const locale = z
  .string()
  .regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/)
  .max(35);
const localizationPatch = z
  .record(
    locale,
    z
      .object({ title: text(1000), description: text(100000) })
      .strict()
      .nullable(),
  )
  .describe(
    "Patch by locale: null removes a locale; null title or description removes that field. Omitted locales and fields are preserved.",
  );
const subtitlePatch = z
  .record(locale, z.string().min(1).max(200000).nullable())
  .describe(
    "Patch subtitle tracks by locale. A string replaces that track; null removes it. Omitted locales are preserved.",
  );
const contentFields = z
  .object({
    songTitle: text(300),
    lyrics: text(100000),
    shortDescription: text(4000),
    introText: text(20000),
    productionNotes: text(50000),
    relatedWorkUids: text(10000),
    vocalLanguages: z
      .array(z.string().regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/))
      .max(30)
      .optional(),
    durationSeconds: z.number().int().positive().nullable().optional(),
  })
  .strict();
const sourceFields = z
  .object({
    sourceType: z.enum(FROM_TYPES).nullable().optional(),
    title: text(500),
    artists: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
    sourceUrl: z
      .url({ protocol: /^https?$/ })
      .max(2000)
      .nullable()
      .optional(),
    ip: text(500),
    series: text(500),
    session: text(500),
    details: text(4000),
  })
  .strict();
const platformFields = z
  .object({
    platform: z.enum(["youtube", "bilibili", "vk", "pixiv"]),
    platformId: text(500),
    title: text(1000),
    description: text(100000),
    localizations: localizationPatch.optional(),
    youtubePrimaryLocale: locale.nullable().optional(),
    subtitlePrimaryLocale: locale.nullable().optional(),
    pixivTags: z
      .array(z.string().trim().min(1).max(300))
      .max(100)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.platform !== "youtube" &&
      (value.localizations !== undefined ||
        value.youtubePrimaryLocale !== undefined ||
        value.subtitlePrimaryLocale !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Localizations and primary locales are supported only for YouTube metadata.",
      });
    }
    if (value.platform !== "pixiv" && value.pixivTags !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "pixivTags is supported only for Pixiv.",
      });
    }
  });
const fields = {
  path: z.string().trim().min(1).max(300).nullable().optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  workType: z.enum(WORK_TYPES).optional(),
  content: contentFields.optional(),
  source: sourceFields.optional(),
  subtitleTracks: subtitlePatch.optional(),
  platforms: z
    .array(platformFields)
    .max(4)
    .refine(
      (items) =>
        new Set(items.map((item) => item.platform)).size === items.length,
      "Each platform may appear only once.",
    )
    .optional(),
  status: z
    .object({
      visible: z.boolean().optional(),
      publishedAt: z.iso.date().nullable().optional(),
    })
    .strict()
    .optional(),
};
export const contentCreateSchema = z
  .object({
    contentId: z.string().trim().min(1).max(300),
    ...fields,
    workType: z.enum(WORK_TYPES),
  })
  .strict();
export const contentUpdateSchema = z
  .object({
    contentId: z.string().trim().min(1).max(300),
    updatedAt: z.iso.datetime(),
    changes: z
      .object(fields)
      .strict()
      .refine(
        (value) => Object.keys(value).length > 0,
        "Provide at least one change.",
      ),
  })
  .strict();

const include = {
  content: true,
  source: true,
  status: true,
  platforms: { orderBy: { platform: "asc" as const } },
  subtitles: true,
} as const;

function jsonObject(
  value: unknown,
  label: string,
): Record<string, Prisma.JsonValue> {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `${label} has an unsupported format; inspect and repair it before editing.`,
    );
  }
  return { ...value } as Record<string, Prisma.JsonValue>;
}

export function mergeSubtitleTracks(
  existing: unknown,
  patch: z.infer<typeof subtitlePatch>,
) {
  const tracks = jsonObject(existing, "Subtitle tracks");
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete tracks[key];
    else tracks[key] = value;
  }
  return tracks as Prisma.InputJsonObject;
}

export function mergePlatformMetadata(
  existing: unknown,
  patch: z.infer<typeof platformFields>,
) {
  const metadata = jsonObject(existing, `${patch.platform} metadata`);
  if (patch.localizations) {
    for (const [key, value] of Object.entries(patch.localizations)) {
      if (value === null) {
        delete metadata[key];
        continue;
      }
      const current = jsonObject(metadata[key], `YouTube localization ${key}`);
      for (const [field, fieldValue] of Object.entries(value)) {
        if (fieldValue === null) delete current[field];
        else if (fieldValue !== undefined) current[field] = fieldValue;
      }
      if (Object.keys(current).length) metadata[key] = current;
      else delete metadata[key];
    }
  }
  if (
    patch.youtubePrimaryLocale !== undefined ||
    patch.subtitlePrimaryLocale !== undefined
  ) {
    const admin = jsonObject(metadata.__admin, "YouTube admin metadata");
    for (const key of [
      "youtubePrimaryLocale",
      "subtitlePrimaryLocale",
    ] as const) {
      const value = patch[key];
      if (value === null) delete admin[key];
      else if (value !== undefined) admin[key] = value;
    }
    if (Object.keys(admin).length) metadata.__admin = admin;
    else delete metadata.__admin;
  }
  if (patch.pixivTags === null) delete metadata.tags;
  else if (patch.pixivTags !== undefined) metadata.tags = patch.pixivTags;
  return metadata as Prisma.InputJsonObject;
}
export async function getReviewWork(contentId: string) {
  const db = getReviewClient();
  // Serialize competing MCP edits; the transaction rechecks the entire snapshot.
  if (isReviewTransaction())
    await db.$queryRaw`SELECT "contentId" FROM music_works WHERE "contentId" = ${contentId} FOR UPDATE`;
  return db.musicWork.findUnique({ where: { contentId }, include });
}

export async function prepareContentChange(
  operation: "content.create" | "content.update",
  value: unknown,
) {
  const input =
    operation === "content.create"
      ? contentCreateSchema.parse(value)
      : contentUpdateSchema.parse(value);
  const work = await getReviewWork(input.contentId);
  if (operation === "content.create") {
    if (work)
      throw new Error(
        "Content ID already exists; review and update it instead.",
      );
    const create = contentCreateSchema.parse(input);
    if (create.status?.visible)
      throw new Error(
        "Create content privately first; publishing is a separate reviewed update.",
      );
  } else {
    const update = contentUpdateSchema.parse(input);
    if (!work) throw new Error("Content record not found.");
    if (work.updatedAt.toISOString() !== update.updatedAt)
      throw new Error(
        "The record changed. Read it again before preparing a preview.",
      );
  }
  const changes =
    operation === "content.create"
      ? contentCreateSchema.parse(input)
      : contentUpdateSchema.parse(input).changes;
  if (changes.subtitleTracks)
    mergeSubtitleTracks(work?.subtitles?.tracks, changes.subtitleTracks);
  for (const platform of changes.platforms ?? []) {
    if (
      platform.localizations !== undefined ||
      platform.youtubePrimaryLocale !== undefined ||
      platform.subtitlePrimaryLocale !== undefined ||
      platform.pixivTags !== undefined
    ) {
      mergePlatformMetadata(
        work?.platforms.find((item) => item.platform === platform.platform)
          ?.metadata,
        platform,
      );
    }
  }
  const youtube = changes.platforms?.find(
    (item) => item.platform === "youtube",
  );
  const previousYoutube = work?.platforms.find(
    (item) => item.platform === "youtube",
  );
  if (
    youtube?.platformId !== undefined &&
    youtube.platformId !== (previousYoutube?.platformId ?? null) &&
    work?.content?.durationSeconds != null &&
    changes.content?.durationSeconds === undefined
  ) {
    throw new Error(
      "Changing the YouTube video requires an explicit durationSeconds value or null to clear the old duration.",
    );
  }
  if (changes.path) {
    const collision = await getReviewClient().musicWork.findFirst({
      where: { path: changes.path, contentId: { not: input.contentId } },
      select: { contentId: true },
    });
    if (collision)
      throw new Error("The requested content path is already in use.");
  }
  return {
    input,
    work,
    requiredScope:
      work?.status?.visible || changes.status?.visible
        ? "mcp:publish"
        : "mcp:review",
  };
}

export async function applyContentChange(
  operation: "content.create" | "content.update",
  value: unknown,
  actor: string,
) {
  const prepared = await prepareContentChange(operation, value);
  const input = prepared.input;
  const changes =
    operation === "content.create"
      ? contentCreateSchema.parse(input)
      : contentUpdateSchema.parse(input).changes;
  const {
    content,
    source,
    platforms,
    subtitleTracks,
    status,
    path,
    contentType,
    workType,
  } = changes;
  const db = getReviewClient();
  const platformData = platforms?.map(
    ({
      localizations,
      youtubePrimaryLocale,
      subtitlePrimaryLocale,
      pixivTags,
      ...data
    }) => {
      const patch = {
        ...data,
        localizations,
        youtubePrimaryLocale,
        subtitlePrimaryLocale,
        pixivTags,
      };
      const hasMetadata =
        localizations !== undefined ||
        youtubePrimaryLocale !== undefined ||
        subtitlePrimaryLocale !== undefined ||
        pixivTags !== undefined;
      return {
        ...data,
        ...(hasMetadata
          ? {
              metadata: mergePlatformMetadata(
                prepared.work?.platforms.find(
                  (item) => item.platform === data.platform,
                )?.metadata,
                patch,
              ),
            }
          : {}),
      };
    },
  );
  const tracks = subtitleTracks
    ? mergeSubtitleTracks(prepared.work?.subtitles?.tracks, subtitleTracks)
    : undefined;
  if (operation === "content.create") {
    await db.musicWork.create({
      data: {
        contentId: input.contentId,
        path,
        contentType: contentType ?? "Music",
        workType: workType as string,
        ...(content ? { content: { create: content } } : {}),
        ...(source ? { source: { create: source } } : {}),
        status: {
          create: { visible: false, publishedAt: status?.publishedAt },
        },
        ...(platformData?.length
          ? { platforms: { create: platformData } }
          : {}),
        ...(tracks ? { subtitles: { create: { tracks } } } : {}),
      },
    });
  } else {
    await db.musicWork.update({
      where: { contentId: input.contentId },
      data: {
        path,
        contentType,
        workType,
        ...(content
          ? { content: { upsert: { create: content, update: content } } }
          : {}),
        ...(source
          ? { source: { upsert: { create: source, update: source } } }
          : {}),
        ...(status
          ? { status: { upsert: { create: status, update: status } } }
          : {}),
        ...(tracks
          ? {
              subtitles: { upsert: { create: { tracks }, update: { tracks } } },
            }
          : {}),
        ...(platformData?.length
          ? {
              platforms: {
                upsert: platformData.map(({ platform, ...data }) => ({
                  where: {
                    contentId_platform: {
                      contentId: input.contentId,
                      platform,
                    },
                  },
                  create: { platform, ...data },
                  update: data,
                })),
              },
            }
          : {}),
      },
    });
  }
  const after = await getReviewWork(input.contentId);
  await writeAudit(db, {
    actor,
    action: operation === "content.create" ? "WORK_CREATED" : "WORK_UPDATED",
    entityType: "WORK",
    entityId: input.contentId,
    title: after?.content?.songTitle || input.contentId,
    before: prepared.work,
    after,
  });
  return {
    kind: "work",
    id: input.contentId,
    url: getAdminUrl(
      `/admin/content/${encodeURIComponent(input.contentId)}`,
    ).toString(),
    updatedAt: after?.updatedAt,
  };
}
