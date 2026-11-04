import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  findPublicSongSuggestions,
  VOTE_COOKIE,
  voterHash,
} from "@/features/song-plans/data";

export const runtime = "nodejs";
const input = z.object({
  title: z.string().max(200),
  artist: z.string().max(200),
});
export async function GET(request: NextRequest) {
  const parsed = input.safeParse({
    title: request.nextUrl.searchParams.get("title") || "",
    artist: request.nextUrl.searchParams.get("artist") || "",
  });
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!parsed.success)
    return NextResponse.json({ code: "invalid" }, { status: 400, headers });
  try {
    const data = await findPublicSongSuggestions(
      parsed.data.title,
      parsed.data.artist,
      voterHash(request.cookies.get(VOTE_COOKIE)?.value),
    );
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ code: "unavailable" }, { status: 503, headers });
  }
}
