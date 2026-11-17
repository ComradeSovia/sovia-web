import {
  getAdminUrl,
  getOriginalRequestUrl,
} from "@sovia/admin/data/admin-url";
import {
  isAdminAuthenticated,
  requireAuditActor,
} from "@sovia/admin/data/auth";
import {
  approveMcpOAuthConsent,
  renderMcpOAuthConsent,
} from "@sovia/admin/data/mcp-oauth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    const url = getAdminUrl("/admin", request);
    const original = getOriginalRequestUrl(request);
    url.searchParams.set("next", `${original.pathname}${original.search}`);
    return Response.redirect(url);
  }

  return renderMcpOAuthConsent(request, await requireAuditActor());
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return Response.json(
      { error: "login_required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return approveMcpOAuthConsent(request, await requireAuditActor());
}
