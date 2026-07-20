import { listGptAnalyticsWorks } from "@sovia/admin/data/gpt-analytics";
import { jsonResponse, requireGptPluginAuth } from "../../_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = requireGptPluginAuth(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);

  return jsonResponse(await listGptAnalyticsWorks({ limit, offset }));
}
