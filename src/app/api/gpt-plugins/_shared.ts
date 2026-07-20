import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function requireGptPluginAuth(request: Request) {
  const configuredKey = process.env.SOVIA_GPT_PLUGINS_API_KEY?.trim();
  if (!configuredKey) {
    return NextResponse.json(
      { message: "SOVIA_GPT_PLUGINS_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (token !== configuredKey) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export function jsonResponse(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
