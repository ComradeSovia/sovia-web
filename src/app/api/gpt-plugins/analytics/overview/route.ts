import { getGptAnalyticsOverview } from "@sovia/admin/data/gpt-analytics";
import { jsonResponse, requireGptPluginAuth } from "../../_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = requireGptPluginAuth(request);
  if (unauthorized) return unauthorized;

  return jsonResponse(await getGptAnalyticsOverview());
}
