import { handleMcpOAuthTokenRequest } from "@sovia/admin/data/mcp-oauth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMcpOAuthTokenRequest(request);
}
