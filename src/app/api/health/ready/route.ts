import { getPrismaClient } from "@sovia/sound/data/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) throw new Error("Database unavailable");
    await prisma.musicWork.findFirst({ select: { contentId: true } });
    return Response.json(
      { ready: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ready: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
