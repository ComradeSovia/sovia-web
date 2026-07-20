import { isAdminAuthenticated } from "@sovia/admin/data/auth";
import { authorizeMcpOAuthRequest } from "@sovia/admin/data/mcp-oauth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    const url = new URL("/admin", request.url);
    url.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return Response.redirect(url);
  }

  return authorizeMcpOAuthRequest(request);
}
