import { randomUUID } from "node:crypto";
import { getPrismaClient } from "@sovia/sound/data/prisma";

const PUBLIC_CHECK_TTL_MS = 12 * 60 * 60 * 1000;
const UNAVAILABLE_CHECK_TTL_MS = 60 * 60 * 1000;
const FAILED_CHECK_BASE_MS = 5 * 60 * 1000;
const FAILED_CHECK_MAX_MS = 6 * 60 * 60 * 1000;
const AVAILABILITY_LEASE_MS = 60 * 1000;

export type YouTubePublicationStatus =
  | {
      reason: "no-video-id";
      status: "unknown";
    }
  | {
      reason: "probe-failed" | "video-public" | "video-unavailable";
      status: "not-published" | "published" | "unknown";
    };

export async function checkYouTubeVideoPublished(
  videoId?: string | null,
): Promise<YouTubePublicationStatus> {
  if (!videoId) {
    return { reason: "no-video-id", status: "unknown" };
  }

  const now = new Date();
  const cached = await readAvailability(videoId);
  if (cached?.availabilityNextCheckAt && cached.availabilityNextCheckAt > now) {
    return toPublicationStatus(cached.availabilityStatus);
  }

  const leaseToken = await claimAvailabilityCheck(videoId, now);
  if (!leaseToken) return toPublicationStatus(cached?.availabilityStatus);

  try {
    const probe = await probeYouTubeAvailability(videoId);
    await recordAvailabilityResult(videoId, probe, leaseToken, now);
    return probe.available
      ? { reason: "video-public", status: "published" }
      : { reason: "video-unavailable", status: "not-published" };
  } catch (error) {
    await recordAvailabilityFailure(
      videoId,
      error,
      leaseToken,
      cached?.availabilityAttemptCount ?? 0,
      now,
    );
    return { reason: "probe-failed", status: "unknown" };
  }
}

async function probeYouTubeAvailability(videoId: string) {
  const params = new URLSearchParams({
    format: "json",
    url: `https://www.youtube.com/watch?v=${videoId}`,
  });
  const response = await fetch(`https://www.youtube.com/oembed?${params}`, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.ok) {
    return { available: true, httpStatus: response.status };
  }
  if ([401, 403, 404, 410].includes(response.status)) {
    return { available: false, httpStatus: response.status };
  }
  throw new Error(`YouTube availability probe returned ${response.status}.`);
}

async function readAvailability(videoId: string) {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    return await prisma.youtubeThumbnailCache.findUnique({
      select: {
        availabilityAttemptCount: true,
        availabilityNextCheckAt: true,
        availabilityStatus: true,
      },
      where: { videoId },
    });
  } catch {
    return null;
  }
}

async function claimAvailabilityCheck(videoId: string, now: Date) {
  const prisma = getPrismaClient();
  if (!prisma) return "no-database";

  const availabilityLeaseToken = randomUUID();
  const availabilityLeaseUntil = new Date(
    now.getTime() + AVAILABILITY_LEASE_MS,
  );
  try {
    await prisma.youtubeThumbnailCache.upsert({
      create: {
        availabilityAttemptCount: 1,
        availabilityCheckedAt: now,
        availabilityLeaseToken,
        availabilityLeaseUntil,
        availabilityStatus: "checking",
        status: "pending",
        videoId,
      },
      update: {},
      where: { videoId },
    });
    const claimed = await prisma.youtubeThumbnailCache.updateMany({
      data: {
        availabilityAttemptCount: { increment: 1 },
        availabilityCheckedAt: now,
        availabilityFailureReason: null,
        availabilityLeaseToken,
        availabilityLeaseUntil,
        availabilityStatus: "checking",
      },
      where: {
        AND: [
          {
            OR: [
              { availabilityLeaseUntil: null },
              { availabilityLeaseUntil: { lt: now } },
            ],
          },
          {
            OR: [
              { availabilityNextCheckAt: null },
              { availabilityNextCheckAt: { lte: now } },
            ],
          },
        ],
        videoId,
      },
    });
    if (claimed.count > 0) return availabilityLeaseToken;

    const current = await prisma.youtubeThumbnailCache.findUnique({
      select: { availabilityLeaseToken: true },
      where: { videoId },
    });
    return current?.availabilityLeaseToken === availabilityLeaseToken
      ? availabilityLeaseToken
      : null;
  } catch {
    return "database-error";
  }
}

async function recordAvailabilityResult(
  videoId: string,
  result: { available: boolean; httpStatus: number },
  leaseToken: string,
  checkedAt: Date,
) {
  const prisma = getPrismaClient();
  if (
    !prisma ||
    leaseToken === "no-database" ||
    leaseToken === "database-error"
  ) {
    return;
  }

  const availabilityStatus = result.available ? "public" : "unavailable";
  const ttl = result.available ? PUBLIC_CHECK_TTL_MS : UNAVAILABLE_CHECK_TTL_MS;
  try {
    await prisma.youtubeThumbnailCache.updateMany({
      data: {
        availabilityCheckedAt: checkedAt,
        availabilityFailureReason: null,
        availabilityHttpStatus: result.httpStatus,
        availabilityLeaseToken: null,
        availabilityLeaseUntil: null,
        availabilityNextCheckAt: new Date(checkedAt.getTime() + ttl),
        availabilityStatus,
      },
      where: { availabilityLeaseToken: leaseToken, videoId },
    });
  } catch {}
}

async function recordAvailabilityFailure(
  videoId: string,
  error: unknown,
  leaseToken: string,
  previousAttemptCount: number,
  checkedAt: Date,
) {
  const prisma = getPrismaClient();
  if (
    !prisma ||
    leaseToken === "no-database" ||
    leaseToken === "database-error"
  ) {
    return;
  }

  const retryMs = Math.min(
    FAILED_CHECK_BASE_MS * 2 ** Math.min(previousAttemptCount, 7),
    FAILED_CHECK_MAX_MS,
  );
  try {
    await prisma.youtubeThumbnailCache.updateMany({
      data: {
        availabilityCheckedAt: checkedAt,
        availabilityFailureReason: getErrorMessage(error),
        availabilityLeaseToken: null,
        availabilityLeaseUntil: null,
        availabilityNextCheckAt: new Date(checkedAt.getTime() + retryMs),
        availabilityStatus: "failed",
      },
      where: { availabilityLeaseToken: leaseToken, videoId },
    });
  } catch {}
}

function toPublicationStatus(
  status: string | null | undefined,
): YouTubePublicationStatus {
  if (status === "public") {
    return { reason: "video-public", status: "published" };
  }
  if (status === "unavailable") {
    return { reason: "video-unavailable", status: "not-published" };
  }
  return { reason: "probe-failed", status: "unknown" };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message.slice(0, 500)
    : "YouTube availability check failed.";
}
