import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("id");

  if (!videoId) {
    return new NextResponse("Missing video id", { status: 400 });
  }

  const url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    return new NextResponse("Image not found", { status: 404 });
  }

  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
