import { getFriendlyDatabaseError } from "@sovia/sound/data/database-errors";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import { auditPlanChange, planSnapshot, writeAudit } from "./review-audit";
import {
  PLAN_STATUSES,
  planFields,
  refreshPlanCompletion,
} from "./song-requests";

export const ADMIN_MUSIC_TODO_STATUSES = PLAN_STATUSES;

export type AdminMusicTodoStatus = (typeof ADMIN_MUSIC_TODO_STATUSES)[number];

export type AdminMusicTodoInput = {
  from?: string | null;
  notes?: string | null;
  sourceArtists?: string | null;
  sourceUrl?: string | null;
  status: AdminMusicTodoStatus;
  title: string;
  visible?: boolean;
};

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error(getFriendlyDatabaseError(null));
  return prisma;
}

export async function listAdminMusicTodos(status?: AdminMusicTodoStatus) {
  return requirePrisma().adminMusicTodo.findMany({
    include: {
      _count: { select: { requests: true, works: true } },
      works: {
        select: { contentId: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      content: {
        select: { contentId: true, content: { select: { songTitle: true } } },
      },
    },
    orderBy: [{ heatScore: "desc" }, { createdAt: "desc" }],
    where: status ? { status } : undefined,
  });
}

export async function getAdminMusicTodo(id: string) {
  return requirePrisma().adminMusicTodo.findUnique({ where: { id } });
}

export async function createAdminMusicTodo(
  input: AdminMusicTodoInput,
  actor = "system",
) {
  if (!input.title.trim()) throw new Error("Song title is required.");
  if (input.status === "COMPLETED") {
    throw new Error("Create or link Content before completing a Todo.");
  }

  return (await createAdminMusicTodos([input], actor))[0];
}

export async function createAdminMusicTodos(
  inputs: AdminMusicTodoInput[],
  actor = "system",
) {
  if (!inputs.length) throw new Error("Select at least one Todo proposal.");
  if (inputs.length > 20) {
    throw new Error("No more than 20 Todo proposals can be added at once.");
  }
  for (const input of inputs) {
    if (!input.title.trim()) throw new Error("Every Todo needs a song title.");
    if (input.status === "COMPLETED") {
      throw new Error("Create or link Content before completing a Todo.");
    }
  }

  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const todos = [];
    for (const input of inputs) {
      const todo = await tx.adminMusicTodo.create({
        data: normalizeTodoInput(input),
      });
      await auditPlanChange(tx, todo.id, null, actor, "PLAN_CREATED");
      todos.push(todo);
    }
    return todos;
  });
}

export async function updateAdminMusicTodo(
  id: string,
  input: AdminMusicTodoInput,
  actor = "system",
) {
  if (!input.title.trim()) throw new Error("Song title is required.");

  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${id} FOR UPDATE`;
    const current = await tx.adminMusicTodo.findUnique({ where: { id } });
    if (!current) throw new Error("Todo could not be found.");
    if (input.status === "COMPLETED" && current.status !== "COMPLETED") {
      throw new Error(
        "Use the plan editor to verify a published Work before completing a plan.",
      );
    }

    const updated = await tx.adminMusicTodo.update({
      data: {
        ...normalizeTodoInput(input),
        completedAt: input.status === "COMPLETED" ? current.completedAt : null,
      },
      where: { id },
    });
    await auditPlanChange(tx, id, current, actor);
    return updated;
  });
}

export async function completeAdminMusicTodo(
  id: string,
  contentId: string,
  actor = "system",
) {
  const prisma = requirePrisma();

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${id} FOR UPDATE`;
    const [todo, content] = await Promise.all([
      tx.adminMusicTodo.findUnique({ where: { id } }),
      tx.musicWork.findUnique({ where: { contentId } }),
    ]);
    if (!todo) throw new Error("Todo could not be found.");
    if (!content) throw new Error("Content could not be found.");
    const previous = await tx.musicPlanWork.findUnique({
      where: { planId_contentId: { planId: id, contentId } },
    });
    await tx.musicPlanWork.upsert({
      where: { planId_contentId: { planId: id, contentId } },
      create: { planId: id, contentId, match: "FULL" },
      update: {},
    });
    const result = await tx.adminMusicTodo.update({
      data: {
        ...(todo.status === "PROPOSED" ? { status: "PLANNING" } : {}),
      },
      where: { id },
    });
    await auditPlanChange(tx, id, todo, actor);
    await refreshPlanCompletion(tx, id, false, actor);
    if (!previous)
      await writeAudit(tx, {
        actor,
        action: "WORK_LINKED",
        entityType: "PLAN",
        entityId: id,
        relatedType: "WORK",
        relatedId: contentId,
        title: todo.title,
        before: { link: null },
        after: { link: { match: "FULL", notes: null } },
      });
    return result;
  });
}

export async function startAdminMusicTodo(
  {
    contentId,
    id,
    workType,
  }: {
    contentId: string;
    id: string;
    workType: string;
  },
  actor = "system",
) {
  const prisma = requirePrisma();

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${id} FOR UPDATE`;
    const [todo, existingContent] = await Promise.all([
      tx.adminMusicTodo.findUnique({ where: { id } }),
      tx.musicWork.findUnique({ where: { contentId } }),
    ]);
    if (!todo) throw new Error("Todo could not be found.");
    if (todo.status === "CANCELLED")
      throw new Error("Reopen the cancelled plan before starting a Work.");
    if (existingContent) throw new Error("Content ID must be unique.");

    const artists = (todo.sourceArtists ?? "")
      .split(",")
      .map((artist) => artist.trim())
      .filter(Boolean);
    await tx.musicWork.create({
      data: {
        content: {
          create: {
            introText: "",
            lyrics: "",
            productionNotes: todo.notes ?? "",
            songTitle: todo.title,
          },
        },
        contentId,
        source: {
          create: {
            artists,
            sourceUrl: todo.sourceUrl,
            title: todo.from === "Contact page" ? null : todo.from,
          },
        },
        status: { create: { visible: false } },
        subtitles: { create: { tracks: {} } },
        workType,
      },
    });

    await tx.adminMusicTodo.update({
      data: {
        ...(todo.contentId ? {} : { contentId }),
        ...(todo.status === "COMPLETED" ? {} : { status: "IN_PRODUCTION" }),
      },
      where: { id },
    });
    await tx.musicPlanWork.create({
      data: { planId: id, contentId, match: "FULL" },
    });
    await auditPlanChange(tx, id, todo, actor);
    await writeAudit(tx, {
      actor,
      action: "WORK_LINKED",
      entityType: "PLAN",
      entityId: id,
      relatedType: "WORK",
      relatedId: contentId,
      title: todo.title,
      before: { link: null },
      after: {
        link: { match: "FULL", notes: null },
        workStatus: "Draft / hidden",
      },
    });
  });
}

export async function syncAdminMusicTodoPublicationStatus(
  contentId: string,
  _published: boolean,
  actor = "system",
) {
  return requirePrisma().$transaction(async (tx) => {
    const links = await tx.musicPlanWork.findMany({
      where: { contentId },
      select: { planId: true },
      orderBy: { planId: "asc" },
    });
    for (const { planId } of links)
      await refreshPlanCompletion(tx, planId, false, actor);
  });
}

export async function returnAdminMusicTodoToPlanning(
  id: string,
  actor = "system",
) {
  return requirePrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${id} FOR UPDATE`;
    const before = await tx.adminMusicTodo.findUniqueOrThrow({ where: { id } });
    const after = await tx.adminMusicTodo.update({
      where: { id },
      data: { completedAt: null, status: "PLANNING" },
    });
    await auditPlanChange(tx, id, before, actor);
    return after;
  });
}

export async function deleteAdminMusicTodo(id: string, actor = "system") {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM admin_music_todos WHERE id = ${id} FOR UPDATE`;
    const todo = await tx.adminMusicTodo.findUnique({ where: { id } });
    if (!todo) throw new Error("Todo could not be found.");
    if (todo.status === "COMPLETED") {
      throw new Error(
        "Return a completed Todo to planning before deleting it.",
      );
    }
    const [requests, works, votes, drafts] = await Promise.all([
      tx.songRequestPlan.count({ where: { planId: id } }),
      tx.musicPlanWork.count({ where: { planId: id } }),
      tx.musicPlanVote.count({ where: { planId: id } }),
      tx.musicPlanningDraftPlan.count({ where: { planId: id } }),
    ]);
    if (requests || works || votes || drafts)
      throw new Error(
        "This plan has source requests, Works or support records. Cancel it instead of deleting its history.",
      );
    await tx.adminMusicTodo.delete({ where: { id } });
    await writeAudit(tx, {
      actor,
      action: "PLAN_DELETED",
      entityType: "PLAN",
      entityId: id,
      title: todo.title,
      before: planSnapshot(todo),
      after: { deleted: true },
    });
  });
}

function normalizeTodoInput(input: AdminMusicTodoInput) {
  const fields = planFields.parse({
    title: input.title,
    from: input.from ?? "",
    notes: input.notes ?? "",
    sourceArtists: input.sourceArtists ?? "",
    sourceUrl: input.sourceUrl ?? "",
  });
  return {
    ...fields,
    status: input.status,
    title: input.title.trim(),
    visible: input.visible ?? false,
  };
}
