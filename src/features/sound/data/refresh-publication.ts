import { getPrismaClient } from "./prisma";
import { listMusicWorks } from "./music-repository";
import { checkYouTubeVideoPublished } from "@sovia/youtube-api/data/publication";
export async function refreshMusicPublication() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable");
  await prisma.$executeRaw`DELETE FROM "security_states" WHERE "expiresAt" < NOW()`;
  const works = (await listMusicWorks(true)).filter((work) => work.u2bId);
  let checked = 0;
  // Bounded batches avoid turning a large catalogue into a single long cron call.
  const cached = await prisma.youtubeThumbnailCache.findMany({
    select: { videoId: true, availabilityNextCheckAt: true },
  });
  const nextChecks = new Map(
    cached.map((row) => [row.videoId, row.availabilityNextCheckAt]),
  );
  const due = works
    .filter((work) => {
      const next = nextChecks.get(work.u2bId as string);
      return !next || next <= new Date();
    })
    .slice(0, 40);
  for (let offset = 0; offset < due.length; offset += 4) {
    await Promise.all(
      due.slice(offset, offset + 4).map(async (work) => {
        await checkYouTubeVideoPublished(work.u2bId);
        checked++;
      }),
    );
  }
  return { checked };
}
