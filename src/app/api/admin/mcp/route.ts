import {
  getAdminMcpAnalyticsCompare,
  getAdminMcpAnalyticsOverview,
  getAdminMcpAnalyticsWork,
  getAdminMcpContentWork,
  listAdminMcpAnalyticsWorks,
  listAdminMcpContentWorks,
} from "@sovia/admin/data/admin-mcp-data";
import {
  getMcpOAuthServerInfo,
  getMcpUnauthorizedHeaders,
  isMcpOAuthConfigured,
  isValidMcpOAuthAccessToken,
} from "@sovia/admin/data/mcp-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRpcRequest = {
  id?: number | string | null;
  jsonrpc?: "2.0";
  method?: string;
  params?: unknown;
};

type ToolDefinition = {
  description: string;
  inputSchema: {
    additionalProperties?: boolean;
    properties?: Record<string, unknown>;
    required?: string[];
    type: "object";
  };
  name: string;
};

const PROTOCOL_VERSION = "2025-06-18";

const tools: ToolDefinition[] = [
  {
    description:
      "Get Sovia YouTube analytics overview, baselines, sync status, totals, and top works.",
    inputSchema: { additionalProperties: false, type: "object" },
    name: "analytics_overview",
  },
  {
    description:
      "List Sovia works with their latest stored YouTube analytics snapshots.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        limit: {
          default: 50,
          description: "Maximum number of works to return. 1-100.",
          maximum: 100,
          minimum: 1,
          type: "integer",
        },
        offset: {
          default: 0,
          description: "Pagination offset.",
          minimum: 0,
          type: "integer",
        },
      },
      type: "object",
    },
    name: "analytics_list_works",
  },
  {
    description:
      "Get one Sovia work with its latest stored YouTube analytics snapshot. Accepts contentId, path, or YouTube video ID.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        id: {
          description: "Content ID, path, or YouTube video ID.",
          type: "string",
        },
      },
      required: ["id"],
      type: "object",
    },
    name: "analytics_get_work",
  },
  {
    description:
      "Compare Sovia works by simple analytics diagnosis groups and the click/retention interpretation matrix.",
    inputSchema: { additionalProperties: false, type: "object" },
    name: "analytics_compare",
  },
  {
    description:
      "List read-only Sovia content data, including titles, source info, style, lyrics, subtitles, platform metadata, and thumbnail URLs.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        limit: {
          default: 50,
          description: "Maximum number of works to return. 1-100.",
          maximum: 100,
          minimum: 1,
          type: "integer",
        },
        offset: {
          default: 0,
          description: "Pagination offset.",
          minimum: 0,
          type: "integer",
        },
      },
      type: "object",
    },
    name: "content_list_works",
  },
  {
    description:
      "Get read-only Sovia content data for one work. Accepts contentId, path, or YouTube video ID.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        id: {
          description: "Content ID, path, or YouTube video ID.",
          type: "string",
        },
      },
      required: ["id"],
      type: "object",
    },
    name: "content_get_work",
  },
];

export async function OPTIONS() {
  return new Response(null, {
    headers: getCorsHeaders(),
    status: 204,
  });
}

export async function GET() {
  return jsonResponse({
    endpoint: "/api/admin/mcp",
    message:
      "Sovia Admin MCP is a JSON-RPC MCP endpoint. Send POST requests with MCP methods such as initialize, tools/list, and tools/call.",
    oauth: getMcpOAuthServerInfo(),
    readonly: true,
    tools: tools.map((tool) => tool.name),
  });
}

export async function POST(request: Request) {
  const authError = getAuthError(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (Array.isArray(body)) {
    const results = await Promise.all(body.map(handleRequest));
    const visibleResults = results.filter(Boolean);
    if (!visibleResults.length) {
      return new Response(null, { headers: getCorsHeaders(), status: 202 });
    }
    return jsonResponse(visibleResults);
  }

  const result = await handleRequest(body);
  if (!result) {
    return new Response(null, { headers: getCorsHeaders(), status: 202 });
  }
  return jsonResponse(result);
}

async function handleRequest(body: unknown) {
  const request = body as JsonRpcRequest;
  const id = request?.id ?? null;

  if (!request || request.jsonrpc !== "2.0" || !request.method) {
    return makeJsonRpcError(id, -32600, "Invalid Request");
  }

  if (request.method.startsWith("notifications/")) {
    return null;
  }

  switch (request.method) {
    case "initialize":
      return makeJsonRpcResult(id, {
        capabilities: {
          tools: {},
        },
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: {
          name: "sovia-admin-mcp",
          title: "Sovia Admin MCP",
          version: "0.1.0",
        },
      });

    case "ping":
      return makeJsonRpcResult(id, {});

    case "tools/list":
      return makeJsonRpcResult(id, { tools });

    case "tools/call":
      return handleToolCall(id, request.params);

    default:
      return makeJsonRpcError(
        id,
        -32601,
        `Method not found: ${request.method}`,
      );
  }
}

async function handleToolCall(id: JsonRpcRequest["id"], params: unknown) {
  const call = params as { arguments?: unknown; name?: string };
  const args = (call?.arguments ?? {}) as Record<string, unknown>;

  try {
    switch (call?.name) {
      case "analytics_overview":
        return makeToolResult(id, await getAdminMcpAnalyticsOverview());

      case "analytics_list_works":
        return makeToolResult(
          id,
          await listAdminMcpAnalyticsWorks(getPaginationArgs(args)),
        );

      case "analytics_get_work": {
        const work = await getAdminMcpAnalyticsWork(
          getRequiredString(args, "id"),
        );
        return makeToolResult(id, work ?? { error: "Work not found." });
      }

      case "analytics_compare":
        return makeToolResult(id, await getAdminMcpAnalyticsCompare());

      case "content_list_works":
        return makeToolResult(
          id,
          await listAdminMcpContentWorks(getPaginationArgs(args)),
        );

      case "content_get_work": {
        const work = await getAdminMcpContentWork(
          getRequiredString(args, "id"),
        );
        return makeToolResult(id, work ?? { error: "Work not found." });
      }

      default:
        return makeJsonRpcError(
          id,
          -32602,
          `Unknown tool: ${call?.name ?? "(missing)"}`,
        );
    }
  } catch (error) {
    return makeJsonRpcError(
      id,
      -32603,
      error instanceof Error ? error.message : "Tool call failed.",
    );
  }
}

function getAuthError(request: Request) {
  const configuredKey = process.env.SOVIA_ADMIN_MCP_API_KEY?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (token && isValidMcpOAuthAccessToken(token)) {
    return null;
  }

  if (configuredKey && token === configuredKey) {
    return null;
  }

  if (!configuredKey && !isMcpOAuthConfigured()) {
    return jsonResponse(
      {
        message:
          "Unauthorized. Configure OAuth or set SOVIA_ADMIN_MCP_API_KEY for static Bearer access.",
      },
      { status: 503 },
    );
  }

  return jsonResponse(
    { message: "Unauthorized." },
    { headers: getMcpUnauthorizedHeaders(request), status: 401 },
  );
}

function getPaginationArgs(args: Record<string, unknown>) {
  return {
    limit: toInteger(args.limit, 50),
    offset: toInteger(args.offset, 0),
  };
}

function getRequiredString(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required string argument: ${key}`);
  }
  return value.trim();
}

function toInteger(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

function makeToolResult(id: JsonRpcRequest["id"], data: unknown) {
  return makeJsonRpcResult(id, {
    content: [
      {
        text: JSON.stringify(data, null, 2),
        type: "text",
      },
    ],
  });
}

function makeJsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return {
    id,
    jsonrpc: "2.0",
    result,
  };
}

function makeJsonRpcError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
) {
  return {
    error: {
      code,
      message,
    },
    id,
    jsonrpc: "2.0",
  };
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return jsonResponse(makeJsonRpcError(id, code, message));
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...getCorsHeaders(),
      ...init?.headers,
    },
  });
}

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Headers":
      "authorization, content-type, mcp-protocol-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
  };
}
