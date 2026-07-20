import { getMcpProtectedResourceMetadata } from "@sovia/admin/data/mcp-oauth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return Response.json(getMcpProtectedResourceMetadata(request), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
