import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import {
  type McpMusicPatch,
  mcpCreateMusicSchema,
  mcpUpdateMusicSchema,
  mergeMcpLocaleMap,
} from "../validation/mcp-music";
import { assertMcpVisibilityChange } from "./mcp-policy";
import { requireMcpDatabase } from "./mcp-settings";

const include = {
  content: true,
  source: true,
  status: true,
  subtitles: true,
  platforms: { orderBy: { platform: "asc" as const } },
} as const;
type Row = Prisma.MusicWorkGetPayload<{ include: typeof include }>;

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
function revision(row: Row) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(row)))
    .digest("hex");
}
function snapshot(row: Row) {
  return JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue;
}

function editable(row: Row) {
  const youtube = jsonObject(
    row.platforms.find((item) => item.platform === "youtube")?.metadata,
  );
  const admin = jsonObject(youtube.__admin);
  const { __admin: _, ...localizations } = youtube;
  const platform = (name: string) =>
    row.platforms.find((item) => item.platform === name);
  return {
    contentId: row.contentId,
    revision: revision(row),
    fields: {
      path: row.path,
      workType: row.workType,
      songTitle: row.content?.songTitle,
      visible: row.status?.visible ?? false,
      publishedAt: row.status?.publishedAt,
      vocalLanguages: row.content?.vocalLanguages ?? [],
      durationSeconds: row.content?.durationSeconds,
      lyrics: row.content?.lyrics,
      shortDescription: row.content?.shortDescription,
      introText: row.content?.introText,
      productionNotes: row.content?.productionNotes,
      relatedWorkUids:
        row.content?.relatedWorkUids?.split(/\s+/).filter(Boolean) ?? [],
      fromTitle: row.source?.title,
      fromArtists: row.source?.artists ?? [],
      fromType: row.source?.sourceType,
      fromSource: row.source?.sourceUrl,
      fromIp: row.source?.ip,
      fromSeries: row.source?.series,
      fromSession: row.source?.session,
      fromDetails: row.source?.details,
      u2bId: platform("youtube")?.platformId,
      youtubeLocalization: localizations,
      youtubePrimaryLocale: admin.youtubePrimaryLocale,
      subtitlePrimaryLocale: admin.subtitlePrimaryLocale,
      subtitleTracks: row.subtitles?.tracks ?? {},
      bilibiliId: platform("bilibili")?.platformId,
      bilibiliTitle: platform("bilibili")?.title,
      bilibiliDescription: platform("bilibili")?.description,
      vkId: platform("vk")?.platformId,
      vkTitle: platform("vk")?.title,
      vkDescription: platform("vk")?.description,
      pixivId: platform("pixiv")?.platformId,
      pixivTitle: platform("pixiv")?.title,
      pixivDescription: platform("pixiv")?.description,
      pixivTags: jsonObject(platform("pixiv")?.metadata).tags ?? [],
    },
  };
}

export async function getMcpEditableMusic(contentId: string) {
  const row = await requireMcpDatabase().musicWork.findUnique({
    where: { contentId },
    include,
  });
  if (!row || row.contentType !== "Music")
    throw new Error(
      "Music work not found. Use the exact contentId from content_search_works.",
    );
  return editable(row);
}

async function applyPatch(
  tx: Prisma.TransactionClient,
  row: Row,
  patch: McpMusicPatch,
) {
  const content: Prisma.MusicWorkContentUncheckedUpdateInput = {};
  for (const field of [
    "songTitle",
    "vocalLanguages",
    "durationSeconds",
    "lyrics",
    "shortDescription",
    "introText",
    "productionNotes",
  ] as const) {
    if (patch[field] !== undefined)
      Object.assign(content, { [field]: patch[field] });
  }
  if (patch.relatedWorkUids !== undefined) {
    const ids = [...new Set(patch.relatedWorkUids)];
    if (ids.includes(row.contentId))
      throw new Error("A work cannot reference itself.");
    if (
      (await tx.musicWork.count({ where: { contentId: { in: ids } } })) !==
      ids.length
    )
      throw new Error("A related contentId does not exist.");
    content.relatedWorkUids = ids.join("\n") || null;
  }
  if (
    patch.u2bId !== undefined &&
    patch.u2bId !==
      row.platforms.find((item) => item.platform === "youtube")?.platformId
  ) {
    // Performance metadata belongs to the old video unless explicitly supplied.
    content.durationSeconds = patch.durationSeconds ?? null;
    content.vocalLanguages = patch.vocalLanguages ?? [];
  }
  // Always touch the parent so admin editors also observe a new update time.
  await tx.musicWork.update({
    where: { contentId: row.contentId },
    data: { path: patch.path, workType: patch.workType, updatedAt: new Date() },
  });
  if (Object.keys(content).length) {
    await tx.musicWorkContent.upsert({
      where: { contentId: row.contentId },
      create: { contentId: row.contentId },
      update: {},
    });
    await tx.musicWorkContent.update({
      where: { contentId: row.contentId },
      data: content,
    });
  }
  if (patch.visible !== undefined || patch.publishedAt !== undefined) {
    const data = { visible: patch.visible, publishedAt: patch.publishedAt };
    await tx.musicWorkStatus.upsert({
      where: { contentId: row.contentId },
      create: { contentId: row.contentId, ...data },
      update: data,
    });
  }
  const source: Record<string, unknown> = {};
  const sourceFields = {
    fromTitle: "title",
    fromArtists: "artists",
    fromType: "sourceType",
    fromSource: "sourceUrl",
    fromIp: "ip",
    fromSeries: "series",
    fromSession: "session",
    fromDetails: "details",
  } as const;
  for (const [field, target] of Object.entries(sourceFields)) {
    const value = patch[field as keyof typeof sourceFields];
    if (value !== undefined) source[target] = value;
  }
  if (patch.fromType === "Original")
    Object.assign(source, {
      title: null,
      artists: [],
      sourceUrl: null,
      ip: null,
      series: null,
      session: null,
      details: null,
    });
  if (Object.keys(source).length)
    await tx.musicWorkSource.upsert({
      where: { contentId: row.contentId },
      create: { contentId: row.contentId, ...source },
      update: source,
    });
  for (const name of ["youtube", "bilibili", "vk", "pixiv"] as const) {
    const fields =
      name === "youtube"
        ? { platformId: patch.u2bId }
        : {
            platformId: patch[`${name}Id`],
            title: patch[`${name}Title`],
            description: patch[`${name}Description`],
          };
    const data: Prisma.MusicWorkPlatformUpdateInput = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    const previous = jsonObject(
      row.platforms.find((item) => item.platform === name)?.metadata,
    );
    if (
      name === "youtube" &&
      (patch.youtubeLocalization !== undefined ||
        patch.youtubePrimaryLocale !== undefined ||
        patch.subtitlePrimaryLocale !== undefined)
    ) {
      const next = mergeMcpLocaleMap(previous, patch.youtubeLocalization ?? {});
      const admin = { ...jsonObject(previous.__admin) };
      for (const field of [
        "youtubePrimaryLocale",
        "subtitlePrimaryLocale",
      ] as const)
        if (patch[field] !== undefined) admin[field] = patch[field];
      next.__admin = admin;
      data.metadata = next as Prisma.InputJsonObject;
    }
    if (name === "pixiv" && patch.pixivTags !== undefined)
      data.metadata = {
        ...previous,
        tags: patch.pixivTags,
      } as Prisma.InputJsonObject;
    if (Object.keys(data).length) {
      await tx.musicWorkPlatform.upsert({
        where: {
          contentId_platform: { contentId: row.contentId, platform: name },
        },
        create: { contentId: row.contentId, platform: name },
        update: {},
      });
      await tx.musicWorkPlatform.update({
        where: {
          contentId_platform: { contentId: row.contentId, platform: name },
        },
        data,
      });
    }
  }
  if (patch.subtitleTracks !== undefined) {
    const tracks = mergeMcpLocaleMap(
      jsonObject(row.subtitles?.tracks),
      patch.subtitleTracks,
    ) as Prisma.InputJsonObject;
    await tx.musicWorkSubtitles.upsert({
      where: { contentId: row.contentId },
      create: { contentId: row.contentId, tracks },
      update: { tracks },
    });
  }
}

export async function writeMcpMusic(
  input: unknown,
  actor: string,
  create: boolean,
) {
  const args = create
    ? mcpCreateMusicSchema.parse(input)
    : mcpUpdateMusicSchema.parse(input);
  const requestHash = createHash("sha256")
    .update(JSON.stringify(canonical(args)))
    .digest("hex");
  const prisma = requireMcpDatabase();
  const result = await prisma.$transaction(
    async (tx) => {
      const settings = await tx.adminMcpSettings.findUnique({
        where: { id: "default" },
      });
      if (!settings?.enabled || !settings.allowWrite)
        throw new Error("MCP music writing is disabled.");
      const replay = await tx.adminMcpWriteLog.findUnique({
        where: { actor_requestId: { actor, requestId: args.requestId } },
      });
      if (replay) {
        if (
          replay.requestHash !== requestHash ||
          replay.contentId !== args.contentId ||
          replay.operation !== (create ? "create" : "update")
        )
          throw new Error(
            "requestId was already used for another operation. Use a fresh UUID for a different edit.",
          );
        return {
          contentId: replay.contentId,
          auditId: replay.id,
          replayed: true,
        };
      }
      let before = await tx.musicWork.findUnique({
        where: { contentId: args.contentId },
        include,
      });
      if (create && before)
        throw new Error("Content ID already exists; use content_update_work.");
      if (!create && (!before || before.contentType !== "Music"))
        throw new Error("Music work not found.");
      if (
        !create &&
        before &&
        "expectedRevision" in args &&
        revision(before) !== args.expectedRevision
      )
        throw new Error(
          "Conflict: this work changed. Read content_get_editable_work again before editing.",
        );
      assertMcpVisibilityChange(
        settings,
        before?.status?.visible ?? false,
        args.patch.visible,
      );
      if (create)
        before = await tx.musicWork.create({
          data: {
            contentId: args.contentId,
            contentType: "Music",
            workType: args.patch.workType ?? "O",
            status: { create: { visible: false } },
          },
          include,
        });
      if (!before) throw new Error("Music work not found.");
      await applyPatch(tx, before, args.patch);
      const after = await tx.musicWork.findUniqueOrThrow({
        where: { contentId: args.contentId },
        include,
      });
      const log = await tx.adminMcpWriteLog.create({
        data: {
          actor,
          requestId: args.requestId,
          requestHash,
          operation: create ? "create" : "update",
          contentId: args.contentId,
          reason: args.reason,
          before: create ? {} : snapshot(before),
          after: snapshot(after),
        },
      });
      return { ...editable(after), auditId: log.id, replayed: false };
    },
    { isolationLevel: "Serializable", timeout: 15000 },
  );
  revalidatePath("/admin/content", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  return result;
}
