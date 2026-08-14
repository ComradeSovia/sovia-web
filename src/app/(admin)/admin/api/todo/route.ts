import { requireAdminSession } from "@sovia/admin/data/auth";
import { createAdminMusicTodo } from "@sovia/admin/data/music-todos";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as Record<string, unknown>;
    const sourceUrl = getString(body.sourceUrl, 2_000);
    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
      throw new Error("Source URL must be a valid http(s) URL.");
    }

    const todo = await createAdminMusicTodo({
      from: getString(body.from, 500) || undefined,
      notes: getString(body.notes, 4_000) || undefined,
      sourceArtists: getString(body.sourceArtists, 1_000) || undefined,
      sourceUrl: sourceUrl || undefined,
      status: "PROPOSED",
      title: getString(body.title, 300),
    });

    return NextResponse.json({ id: todo.id });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Todo could not be added.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

function getString(value: unknown, maxLength: number) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Todo input is invalid.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error("Todo input is too long.");
  return normalized;
}
