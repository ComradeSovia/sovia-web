import { createHmac, randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  setPlanSupport,
  VOTE_COOKIE,
  VoteError,
  voterHash,
} from "@/features/song-plans/data";

export const runtime = "nodejs";
const input = z.object({ supported: z.boolean() }).strict();
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json({ code: "invalid" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ code: "invalid" }, { status: 400 });
  try {
    const { id } = await params;
    if (!id || id.length > 300)
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    const raw = await request.text();
    if (raw.length > 512)
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    const parsed = input.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    const previousToken = request.cookies.get(VOTE_COOKIE)?.value;
    if (!voterHash(previousToken)) {
      const response = NextResponse.json(
        { initialize: true },
        { headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies.set(VOTE_COOKIE, randomUUID(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 31536000,
      });
      return response;
    }
    const token = voterHash(previousToken)
      ? (previousToken as string)
      : randomUUID();
    const voterId = voterHash(token) as string;
    // Forwarded IP headers are forgeable without a trusted proxy configuration.
    const header =
      process.env.SOVIA_VOTE_TRUSTED_IP_HEADER?.trim().toLowerCase();
    const secret =
      process.env.SOVIA_VOTE_SECRET || process.env.SOVIA_ADMIN_SESSION_SECRET;
    const ip =
      header && secret
        ? request.headers.get(header)?.split(",")[0]?.trim().slice(0, 128)
        : null;
    const networkKey =
      ip && secret
        ? createHmac("sha256", secret)
            .update(`song-plan-network:${ip}`)
            .digest("hex")
        : undefined;
    const result = await setPlanSupport(
      id,
      voterId,
      parsed.data.supported,
      networkKey,
    );
    const response = NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.set(VOTE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 31536000,
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    const code = error instanceof VoteError ? error.code : "unavailable";
    return NextResponse.json(
      { code },
      {
        status:
          code === "rateLimited" ? 429 : error instanceof VoteError ? 404 : 503,
      },
    );
  }
}
