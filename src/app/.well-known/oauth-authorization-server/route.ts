import { getMcpOAuthMetadata } from "@sovia/admin/data/mcp-oauth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return Response.json(getMcpOAuthMetadata(request), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
