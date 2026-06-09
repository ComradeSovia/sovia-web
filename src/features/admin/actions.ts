"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  requireAdminSession,
} from "./data/auth";
import { deleteMusicWork, saveMusicWork } from "./data/music-admin";

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAdmin(formData: FormData) {
  const password = getString(formData, "password");
  await createAdminSession(password);
  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin");
}

export async function saveMusicWorkAction(formData: FormData) {
  await requireAdminSession();

  const currentPath = getOptionalString(formData, "currentPath");
  const path = getString(formData, "path");
  const vid = getOptionalString(formData, "vid") ?? path;
  const title = getString(formData, "title");

  if (!path || !title) {
    throw new Error("Path and title are required.");
  }

  try {
    await saveMusicWork({
      currentPath,
      work: {
        path,
        vid,
        title,
        original: getOptionalString(formData, "original"),
        u2bId: getOptionalString(formData, "u2bId"),
        series: getOptionalString(formData, "series"),
        description: getString(formData, "description"),
        lyrics: getString(formData, "lyrics"),
      },
    });
  } catch {
    redirect("/admin?error=database");
  }

  revalidatePath("/admin");
  revalidatePath("/sound");
  revalidatePath(`/sound/${path}`);
}

export async function deleteMusicWorkAction(formData: FormData) {
  await requireAdminSession();

  const path = getString(formData, "path");
  if (!path) {
    throw new Error("Path is required.");
  }

  try {
    await deleteMusicWork(path);
  } catch {
    redirect("/admin?error=database");
  }

  revalidatePath("/admin");
  revalidatePath("/sound");
  revalidatePath(`/sound/${path}`);
}
