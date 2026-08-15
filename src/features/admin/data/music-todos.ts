import { getFriendlyDatabaseError } from "@sovia/sound/data/database-errors";
import { getPrismaClient } from "@sovia/sound/data/prisma";

export const ADMIN_MUSIC_TODO_STATUSES = [
  "PROPOSED",
  "PLANNING",
  "COMPLETED",
] as const;

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

export async function createAdminMusicTodo(input: AdminMusicTodoInput) {
  if (!input.title.trim()) throw new Error("Song title is required.");
  if (input.status === "COMPLETED") {
    throw new Error("Create or link Content before completing a Todo.");
  }

  return requirePrisma().adminMusicTodo.create({
    data: normalizeTodoInput(input),
  });
}

export async function createAdminMusicTodos(inputs: AdminMusicTodoInput[]) {
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
  return prisma.$transaction(
    inputs.map((input) =>
      prisma.adminMusicTodo.create({ data: normalizeTodoInput(input) }),
    ),
  );
}

export async function updateAdminMusicTodo(
  id: string,
  input: AdminMusicTodoInput,
) {
  if (!input.title.trim()) throw new Error("Song title is required.");

  const prisma = requirePrisma();
  const current = await prisma.adminMusicTodo.findUnique({ where: { id } });
  if (!current) throw new Error("Todo could not be found.");
  if (input.status === "COMPLETED" && !current.contentId) {
    throw new Error("Create or link Content before completing a Todo.");
  }

  return prisma.adminMusicTodo.update({
    data: normalizeTodoInput(input),
    where: { id },
  });
}

export async function completeAdminMusicTodo(id: string, contentId: string) {
  const prisma = requirePrisma();

  return prisma.$transaction(async (tx) => {
    const [todo, content] = await Promise.all([
      tx.adminMusicTodo.findUnique({ where: { id } }),
      tx.musicWork.findUnique({ where: { contentId } }),
    ]);
    if (!todo) throw new Error("Todo could not be found.");
    if (!content) throw new Error("Content could not be found.");
    if (todo.contentId && todo.contentId !== contentId) {
      throw new Error("Todo is already linked to another Content record.");
    }

    return tx.adminMusicTodo.update({
      data: {
        completedAt: null,
        contentId,
        status: "PLANNING",
      },
      where: { id },
    });
  });
}

export async function startAdminMusicTodo({
  contentId,
  id,
  workType,
}: {
  contentId: string;
  id: string;
  workType: string;
}) {
  const prisma = requirePrisma();

  return prisma.$transaction(async (tx) => {
    const [todo, existingContent] = await Promise.all([
      tx.adminMusicTodo.findUnique({ where: { id } }),
      tx.musicWork.findUnique({ where: { contentId } }),
    ]);
    if (!todo) throw new Error("Todo could not be found.");
    if (todo.contentId) {
      throw new Error("Todo is already linked to a Content record.");
    }
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
            productionNotes: "",
            songTitle: todo.title,
          },
        },
        contentId,
        source: {
          create: {
            artists,
            sourceUrl: todo.sourceUrl,
            title: todo.from,
          },
        },
        status: { create: { visible: false } },
        subtitles: { create: { tracks: {} } },
        workType,
      },
    });

    await tx.adminMusicTodo.update({
      data: {
        completedAt: null,
        contentId,
        status: "PLANNING",
      },
      where: { id },
    });
  });
}

export async function syncAdminMusicTodoPublicationStatus(
  contentId: string,
  published: boolean,
) {
  return requirePrisma().adminMusicTodo.updateMany({
    data: published
      ? { completedAt: new Date(), status: "COMPLETED" }
      : { completedAt: null, status: "PLANNING" },
    where: { contentId },
  });
}

export async function returnAdminMusicTodoToPlanning(id: string) {
  return requirePrisma().adminMusicTodo.update({
    data: { completedAt: null, contentId: null, status: "PROPOSED" },
    where: { id },
  });
}

export async function deleteAdminMusicTodo(id: string) {
  const prisma = requirePrisma();
  const todo = await prisma.adminMusicTodo.findUnique({ where: { id } });
  if (!todo) throw new Error("Todo could not be found.");
  if (todo.status === "COMPLETED") {
    throw new Error("Return a completed Todo to planning before deleting it.");
  }
  await prisma.adminMusicTodo.delete({ where: { id } });
}

function normalizeTodoInput(input: AdminMusicTodoInput) {
  return {
    from: input.from?.trim() || null,
    notes: input.notes?.trim() || null,
    sourceArtists: input.sourceArtists?.trim() || null,
    sourceUrl: input.sourceUrl?.trim() || null,
    status: input.status,
    title: input.title.trim(),
    visible: input.visible ?? false,
  };
}
