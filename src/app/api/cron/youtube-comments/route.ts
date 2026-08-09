import { timingSafeEqual } from "node:crypto";
import { syncAdminYoutubeComments } from "@sovia/admin/data/youtube-comments";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  const providedSecret = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!isMatchingSecret(configuredSecret, providedSecret)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAdminYoutubeComments();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Comment sync failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}

function isMatchingSecret(
  configuredSecret: string | undefined,
  providedSecret: string | undefined,
) {
  if (!configuredSecret || !providedSecret) return false;
  const configured = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret);
  return (
    configured.length === provided.length &&
    timingSafeEqual(configured, provided)
  );
}
