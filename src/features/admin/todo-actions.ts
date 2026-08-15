"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "./data/auth";
import {
  ADMIN_MUSIC_TODO_STATUSES,
  type AdminMusicTodoStatus,
  createAdminMusicTodos,
  deleteAdminMusicTodo,
  returnAdminMusicTodoToPlanning,
  updateAdminMusicTodo,
} from "./data/music-todos";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || undefined;
}

function getTodoReturnPath(formData: FormData) {
  const value = getString(formData, "returnTo");
  return value.startsWith("/admin/todo") && !value.startsWith("//")
    ? value
    : "/admin/todo";
}

function getStatus(value: string): AdminMusicTodoStatus {
  if (ADMIN_MUSIC_TODO_STATUSES.includes(value as AdminMusicTodoStatus)) {
    return value as AdminMusicTodoStatus;
  }
  throw new Error("Todo status is invalid.");
}

function getTodoInput(formData: FormData) {
  const sourceUrl = getOptionalString(formData, "sourceUrl");
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    throw new Error("Source URL must be a valid http(s) URL.");
  }

  return {
    from: getOptionalString(formData, "from"),
    notes: getOptionalString(formData, "notes"),
    sourceArtists: getOptionalString(formData, "sourceArtists"),
    sourceUrl,
    status: getStatus(getString(formData, "todoStatus") || "PROPOSED"),
    title: getString(formData, "title"),
  };
}

function redirectWithMessage(
  path: string,
  message: string,
  status: "error" | "success",
): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(
    `${path}${separator}message=${encodeURIComponent(message)}&status=${status}`,
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Todo action failed.";
}

export async function createAdminMusicTodoBatchAction(formData: FormData) {
  await requireAdminSession();
  const returnTo = getTodoReturnPath(formData);
  let proposalCount = 0;

  try {
    const proposals = parseTodoProposals(getString(formData, "proposals"));
    proposalCount = proposals.length;
    await createAdminMusicTodos(
      proposals.map((proposal) => ({
        ...proposal,
        status: "PROPOSED",
      })),
    );
  } catch (error) {
    redirectWithMessage(returnTo, getErrorMessage(error), "error");
  }

  revalidatePath("/admin/todo");
  redirectWithMessage(
    returnTo,
    `${proposalCount} Todo proposal${proposalCount === 1 ? "" : "s"} added.`,
    "success",
  );
}

export async function updateAdminMusicTodoAction(formData: FormData) {
  await requireAdminSession();
  const returnTo = getTodoReturnPath(formData);

  try {
    await updateAdminMusicTodo(
      getString(formData, "todoId"),
      getTodoInput(formData),
    );
  } catch (error) {
    redirectWithMessage(returnTo, getErrorMessage(error), "error");
  }

  revalidatePath("/admin/todo");
  redirectWithMessage(returnTo, "Todo saved.", "success");
}

export async function returnAdminMusicTodoToPlanningAction(formData: FormData) {
  await requireAdminSession();
  const returnTo = getTodoReturnPath(formData);

  try {
    await returnAdminMusicTodoToPlanning(getString(formData, "todoId"));
  } catch (error) {
    redirectWithMessage(returnTo, getErrorMessage(error), "error");
  }

  revalidatePath("/admin/todo");
  redirectWithMessage(returnTo, "Todo returned to proposed.", "success");
}

export async function deleteAdminMusicTodoAction(formData: FormData) {
  await requireAdminSession();
  const returnTo = getTodoReturnPath(formData);

  try {
    await deleteAdminMusicTodo(getString(formData, "todoId"));
  } catch (error) {
    redirectWithMessage(returnTo, getErrorMessage(error), "error");
  }

  revalidatePath("/admin/todo");
  redirectWithMessage(returnTo, "Todo deleted.", "success");
}

function parseTodoProposals(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Generated Todo proposals are invalid.");
  }
  if (!Array.isArray(parsed) || !parsed.length || parsed.length > 20) {
    throw new Error("Select between 1 and 20 Todo proposals.");
  }

  return parsed.map((proposal) => {
    if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
      throw new Error("Generated Todo proposals are invalid.");
    }
    const value = proposal as Record<string, unknown>;
    const title = getProposalString(value, "title", 300);
    if (!title) throw new Error("Every Todo needs a song title.");
    const sourceUrl = getProposalString(value, "sourceUrl", 2_000);
    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
      throw new Error("Source URL must be a valid http(s) URL.");
    }

    return {
      from: getProposalString(value, "from", 500) || undefined,
      notes: getProposalString(value, "notes", 4_000) || undefined,
      sourceArtists:
        getProposalString(value, "sourceArtists", 1_000) || undefined,
      sourceUrl: sourceUrl || undefined,
      title,
    };
  });
}

function getProposalString(
  proposal: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = proposal[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new Error("Generated Todo proposals are invalid.");
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${key} is too long.`);
  }
  return normalized;
}
