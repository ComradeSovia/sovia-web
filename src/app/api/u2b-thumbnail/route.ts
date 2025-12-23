import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("id");

  if (!videoId) {
    return new NextResponse("Missing video id", { status: 400 });
  }

  const sources = ["maxresdefault.jpg", "hqdefault.jpg", "mqdefault.jpg"];

  for (const file of sources) {
    const url = `https://img.youtube.com/vi/${videoId}/${file}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "force-cache",
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  }

  return new NextResponse("Thumbnail not found", { status: 404 });
}
