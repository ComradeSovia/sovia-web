import { requireAdminSession } from "@sovia/admin/data/auth";
import {
  getAdminMusicTodo,
  updateAdminMusicTodo,
} from "@sovia/admin/data/music-todos";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const todo = await getAdminMusicTodo(id);
    if (!todo) throw new Error("Todo could not be found.");
    return NextResponse.json(todo);
  } catch (error) {
    return errorResponse(error, "Todo could not be loaded.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const current = await getAdminMusicTodo(id);
    if (!current) throw new Error("Todo could not be found.");
    const body = (await request.json()) as Record<string, unknown>;
    const sourceUrl = getString(body.sourceUrl, 2_000);
    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
      throw new Error("Source URL must be a valid http(s) URL.");
    }

    await updateAdminMusicTodo(id, {
      from: getString(body.from, 500) || undefined,
      notes: getString(body.notes, 4_000) || undefined,
      sourceArtists: getString(body.sourceArtists, 1_000) || undefined,
      sourceUrl: sourceUrl || undefined,
      status: current.status,
      title: getString(body.title, 300),
      visible: body.visible === true,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return errorResponse(error, "Todo could not be saved.");
  }
}

function getString(value: unknown, maxLength: number) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Todo input is invalid.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error("Todo input is too long.");
  return normalized;
}

function errorResponse(error: unknown, fallback: string) {
  const message =
    error instanceof Error && error.message ? error.message : fallback;
  return NextResponse.json({ message }, { status: 400 });
}
