import {
  findAdminMcpAnalyticsOutliers,
  getAdminMcpAnalyticsCompare,
  getAdminMcpAnalyticsOverview,
  getAdminMcpAnalyticsWork,
  getAdminMcpContentWork,
  getAdminMcpWorkInsight,
  listAdminMcpAnalyticsWorks,
  listAdminMcpContentWorks,
  listAdminMcpMissingContentFields,
  searchAdminMcpContentWorks,
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
      "Search read-only Sovia content data by text, language, work type, music style, YouTube presence, lyrics, subtitles, and visibility.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        hasLyrics: {
          description: "Filter works by whether lyrics are present.",
          type: "boolean",
        },
        hasSubtitles: {
          description: "Filter works by whether subtitle tracks are present.",
          type: "boolean",
        },
        hasYoutube: {
          description: "Filter works by whether a YouTube video ID is present.",
          type: "boolean",
        },
        language: {
          description:
            "Exact locale filter, such as ru, en, ja, zh-Hans, or zh-Hant.",
          type: "string",
        },
        limit: {
          default: 50,
          description: "Maximum number of works to return. 1-100.",
          maximum: 100,
          minimum: 1,
          type: "integer",
        },
        musicStyle: {
          description: "Exact music style filter.",
          type: "string",
        },
        offset: {
          default: 0,
          description: "Pagination offset.",
          minimum: 0,
          type: "integer",
        },
        q: {
          description:
            "Case-insensitive text query across titles, IDs, source fields, lyrics, descriptions, and YouTube localizations.",
          type: "string",
        },
        visible: {
          description: "Filter works by public visibility.",
          type: "boolean",
        },
        workType: {
          description: "Exact work type filter.",
          type: "string",
        },
      },
      type: "object",
    },
    name: "content_search_works",
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
  {
    description:
      "Get an AI-analysis-friendly insight package for one Sovia work, including strengths, risks, comparable works, missing data, and suggested questions.",
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
    name: "analysis_get_work_insight",
  },
  {
    description:
      "Find analytics outliers, including strong overall works, retention issues, low-reach high-retention works, subscriber converters, and missing analytics depth.",
    inputSchema: { additionalProperties: false, type: "object" },
    name: "analytics_find_outliers",
  },
  {
    description:
      "List content records with missing fields that limit analytics or AI analysis, grouped by missing YouTube, subtitles, style, basics, and analytics.",
    inputSchema: { additionalProperties: false, type: "object" },
    name: "content_list_missing_fields",
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

      case "analytics_find_outliers":
        return makeToolResult(id, await findAdminMcpAnalyticsOutliers());

      case "content_list_works":
        return makeToolResult(
          id,
          await listAdminMcpContentWorks(getPaginationArgs(args)),
        );

      case "content_search_works":
        return makeToolResult(
          id,
          await searchAdminMcpContentWorks(getContentSearchArgs(args)),
        );

      case "content_get_work": {
        const work = await getAdminMcpContentWork(
          getRequiredString(args, "id"),
        );
        return makeToolResult(id, work ?? { error: "Work not found." });
      }

      case "analysis_get_work_insight": {
        const insight = await getAdminMcpWorkInsight(
          getRequiredString(args, "id"),
        );
        return makeToolResult(id, insight ?? { error: "Work not found." });
      }

      case "content_list_missing_fields":
        return makeToolResult(id, await listAdminMcpMissingContentFields());

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

function getContentSearchArgs(args: Record<string, unknown>) {
  return {
    hasLyrics: toOptionalBoolean(args.hasLyrics),
    hasSubtitles: toOptionalBoolean(args.hasSubtitles),
    hasYoutube: toOptionalBoolean(args.hasYoutube),
    language: toOptionalString(args.language),
    limit: toInteger(args.limit, 50),
    musicStyle: toOptionalString(args.musicStyle),
    offset: toInteger(args.offset, 0),
    q: toOptionalString(args.q),
    visible: toOptionalBoolean(args.visible),
    workType: toOptionalString(args.workType),
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

function toOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
