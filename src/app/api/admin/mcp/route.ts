import {
  checkAdminMcpContentDuplicate,
  compareAdminMcpAnalyticsCohort,
  compareAdminMcpVersions,
  findAdminMcpAnalyticsOutliers,
  getAdminMcpAnalyticsCompare,
  getAdminMcpAnalyticsOverview,
  getAdminMcpAnalyticsWork,
  getAdminMcpContentWork,
  getAdminMcpEarlyPerformance,
  getAdminMcpRecentWorks,
  getAdminMcpRetention,
  getAdminMcpTrafficSources,
  getAdminMcpWorkInsight,
  getAdminMcpYoutubeComments,
  listAdminMcpAnalyticsWorks,
  listAdminMcpContentWorks,
  listAdminMcpMissingContentFields,
  searchAdminMcpContentWorks,
} from "@sovia/admin/data/admin-mcp-data";
import {
  getAudienceIntelligence,
  getChannelIntelligence,
  getContentStrategy,
} from "@sovia/admin/data/analytics-intelligence";
import { authenticateMcp, type McpAccess } from "@sovia/admin/data/mcp-auth";
import {
  getMcpEditableMusic,
  writeMcpMusic,
} from "@sovia/admin/data/mcp-music";
import {
  getMcpOAuthServerInfo,
  getMcpUnauthorizedHeaders,
} from "@sovia/admin/data/mcp-oauth";
import { canUseMcpTool } from "@sovia/admin/data/mcp-policy";
import { readMcpRequestJson } from "@sovia/admin/data/mcp-request";
import { getMcpSettings } from "@sovia/admin/data/mcp-settings";
import { getSongCandidateIntelligence } from "@sovia/admin/data/song-candidate-intelligence";
import { syncAdminYoutubeAnalytics } from "@sovia/admin/data/youtube-analytics";
import { syncAdminYoutubeComments } from "@sovia/admin/data/youtube-comments";
import {
  mcpCreateMusicSchema,
  mcpUpdateMusicSchema,
} from "@sovia/admin/validation/mcp-music";
import { z } from "zod";
import { allowRequest } from "@/shared/lib/security-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRpcRequest = {
  id?: number | string | null;
  jsonrpc?: "2.0";
  method?: string;
  params?: unknown;
};

type ObjectSchema = {
  additionalProperties?: boolean;
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  type: "object";
};

type ToolDefinition = {
  annotations?: Record<string, unknown>;
  description: string;
  inputSchema: ObjectSchema;
  name: string;
  outputSchema: ObjectSchema;
};

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_VERSION = "0.3.0";

const readOnlyToolAnnotations = {
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
  readOnlyHint: true,
};

const defaultOutputSchema = {
  additionalProperties: true,
  description: "Structured JSON result returned by this tool.",
  type: "object",
} satisfies ObjectSchema;

const commentsListInputSchema = {
  additionalProperties: false,
  properties: {
    hideOwn: {
      default: true,
      description:
        "Hide comments authored by the connected Sovia channel. Disable when analyzing Sovia's own top-level comments.",
      type: "boolean",
    },
    hideReplied: {
      default: true,
      description:
        "Hide comments that the connected Sovia channel has already replied to. Keep enabled for an actionable inbox.",
      type: "boolean",
    },
    id: {
      description: "Optional content ID, path, or YouTube video ID.",
      type: "string",
    },
    limit: {
      default: 20,
      description:
        "Maximum comments to return. 1-50; keep this small to control MCP context usage.",
      maximum: 50,
      minimum: 1,
      type: "integer",
    },
    offset: {
      default: 0,
      description: "Pagination offset. Use hasMore and the returned limit.",
      minimum: 0,
      type: "integer",
    },
    q: {
      description: "Optional comment text, viewer, or video ID search.",
      type: "string",
    },
    sort: {
      default: "newest",
      description: "Order comments for review or prioritization.",
      enum: ["newest", "oldest", "mostLiked", "mostReplies"],
      type: "string",
    },
  },
  type: "object",
} satisfies ToolDefinition["inputSchema"];

const toolDefinitions: Array<Omit<ToolDefinition, "outputSchema">> = [
  {
    name: "content_get_editable_work",
    description:
      "Read editable song fields and revision. Use the exact contentId from content_search_works. Read this before proposing changes and calling content_update_work; never infer or change content IDs.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["contentId"],
      properties: { contentId: { type: "string" } },
    },
  },
  {
    name: "content_update_work",
    description:
      "Save song edits to PostgreSQL only after showing the intended field changes and receiving the user's instruction to save. Read content_get_editable_work and pass expectedRevision. patch contains only changed fields; null clears values; locale maps merge per locale (null removes a locale). Supply confirmWrite=true, reason and UUID requestId; reuse the SAME requestId only for retries of the SAME operation. A conflict requires rereading and reviewing changes. Does not delete records or publish to external platforms.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: z.toJSONSchema(mcpUpdateMusicSchema) as ObjectSchema,
  },
  {
    name: "content_create_work",
    description:
      "Create a song only when the user explicitly asks to save a new song. Check content_check_duplicate first. patch.songTitle and patch.workType are required. Supply confirmWrite=true, reason and UUID requestId; reuse it on retries. New songs default to hidden; visible=true requires publishing permission. Does not publish to external platforms.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: z.toJSONSchema(mcpCreateMusicSchema) as ObjectSchema,
  },
  {
    name: "analysis_score_song_candidate",
    description:
      "Transparent historical catalog-fit score with duplicate exclusion, same-age evidence, weights, sample sizes, coverage and uncertainty. No trend data is fabricated; no catalog writes or YouTube requests.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string", maxLength: 200 },
        sourceTitle: { type: "string", maxLength: 200 },
        artist: { type: "string", maxLength: 200 },
        ip: { type: "string", maxLength: 200 },
        series: { type: "string", maxLength: 200 },
        workType: { type: "string", enum: ["O", "CO", "C", "LC", "R"] },
        vocalLanguages: {
          type: "string",
          description:
            "Explicit vocal ISO language codes separated by commas; never metadata/subtitle languages.",
        },
        durationSeconds: {
          type: "string",
          description: "Positive integer seconds; omitted means unknown.",
        },
        hours: { type: "integer", enum: [24, 72, 168, 672], default: 168 },
        allowRemake: { type: "boolean", default: false },
      },
    },
  },
  {
    name: "analytics_channel_trends",
    description:
      "Cached daily channel metrics, adjacent equal-period comparison, contribution decomposition, and completeness. No YouTube requests.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        days: { type: "integer", enum: [7, 28, 90, 365] },
        start: {
          type: "string",
          description: "YYYY-MM-DD Pacific calendar date",
        },
        end: {
          type: "string",
          description: "YYYY-MM-DD; must be a completed Pacific day",
        },
      },
    },
  },
  {
    name: "analytics_content_strategy",
    description:
      "IP/series, source type, work type, metadata-language medians and distributions from verified completed same-age windows; recent views and evergreen eligibility.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        hours: { type: "integer", enum: [24, 72, 168, 672], default: 168 },
      },
    },
  },
  {
    name: "analytics_audience_geography",
    description:
      "Cached country and top-250 city metrics with privacy limitations and previous 28-day comparison. No inferred unique/returning viewers.",
    inputSchema: { type: "object", additionalProperties: false },
  },
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
      "Search read-only Sovia content with lexical, semantic, or hybrid matching. Returns compact candidates with confidence; use content_get_work with contentId to confirm and read full content.",
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
        matchMode: {
          default: "hybrid",
          description:
            "hybrid combines lexical and semantic matching; lexical is best for names and IDs; semantic is best for themes and concepts.",
          enum: ["hybrid", "lexical", "semantic"],
          type: "string",
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
            "Text query across titles, IDs, source fields, lyrics, descriptions, and YouTube localizations. Use the returned contentId with content_get_work to confirm a candidate.",
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
      "Check whether a song/source has already been made by Sovia. Returns likely duplicate, version, same-IP, and partial matches with scores and reasons.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        artist: {
          description: "Original artist or performer name to match.",
          type: "string",
        },
        ip: {
          description: "Source IP or franchise name to match.",
          type: "string",
        },
        limit: {
          default: 20,
          description: "Maximum number of matches to return. 1-100.",
          maximum: 100,
          minimum: 1,
          type: "integer",
        },
        q: {
          description:
            "General query across titles, source fields, lyrics, descriptions, and platform metadata.",
          type: "string",
        },
        sourceTitle: {
          description: "Original source song/work title to match.",
          type: "string",
        },
        title: {
          description: "Sovia song title or candidate title to match.",
          type: "string",
        },
      },
      type: "object",
    },
    name: "content_check_duplicate",
  },
  {
    description:
      "List recent Sovia works sorted by publishedAt descending. Useful before recommending new song candidates.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        hasYoutube: {
          description: "Filter works by whether a YouTube video ID is present.",
          type: "boolean",
        },
        limit: {
          default: 20,
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
    name: "content_get_recent_works",
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
      "Compare verified completed same-age publish-date windows. Includes peer ranking, median, diagnostic evidence and missing-data coverage; no lifetime fallback.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        matchDuration: {
          type: "boolean",
          default: false,
          description:
            "Also require the target video duration band. Unknown durations never match.",
        },
        hours: {
          type: "integer",
          enum: [24, 72, 168, 672],
          default: 168,
          description: "Completed publish-date window; not clock hours.",
        },
        cohort: {
          description:
            "Cohort strategy: recent, sameLanguage (metadata), sameStyle (work type), sameSourceIp, or sameSourceType.",
          enum: [
            "recent",
            "sameLanguage",
            "sameStyle",
            "sameSourceIp",
            "sameSourceType",
            "sameVocalLanguage",
            "similarDuration",
          ],
          type: "string",
        },
        id: {
          description: "Content ID, path, or YouTube video ID.",
          type: "string",
        },
        limit: {
          default: 10,
          description: "Recent peer count: 10, 20, or 50; other values use 20.",
          maximum: 100,
          minimum: 1,
          type: "integer",
        },
      },
      required: ["id"],
      type: "object",
    },
    name: "analytics_compare_cohort",
  },
  {
    description:
      "Get synced early performance windows for a work or all synced works. Uses publish-date calendar windows: 24h, 72h, 168h, and 672h where available.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        id: {
          description:
            "Optional content ID, path, or YouTube video ID. Omit to list all synced early performance snapshots.",
          type: "string",
        },
      },
      type: "object",
    },
    name: "analytics_get_early_performance",
  },
  {
    description:
      "Get synced YouTube traffic source analytics by insightTrafficSourceType for a work or all works. Defaults to the latest 90-day traffic source sync.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        id: {
          description:
            "Optional content ID, path, or YouTube video ID. Omit to list all synced traffic source snapshots.",
          type: "string",
        },
        periodDays: {
          default: 90,
          description: "Traffic source period in days. Currently synced as 90.",
          type: "integer",
        },
      },
      type: "object",
    },
    name: "analytics_get_traffic_sources",
  },
  {
    description:
      "Get the actionable YouTube comment inbox for AI review. Defaults to unanswered audience comments, supports work/search filters and priority sorting, and includes work context plus direct YouTube URLs.",
    inputSchema: commentsListInputSchema,
    name: "comments_list",
  },
  {
    description:
      "Deprecated compatibility alias for comments_list. Prefer comments_list for new clients.",
    inputSchema: commentsListInputSchema,
    name: "analytics_list_youtube_comments",
  },
  {
    description:
      "Get YouTube audience-retention curves and summaries for completed 24h, 72h, 7d, and 28d windows. This is playback-position retention, not returning-viewer cohort retention.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        elapsedHours: {
          description: "Optional completed window: 24, 72, 168, or 672 hours.",
          enum: [24, 72, 168, 672],
          type: "integer",
        },
        id: {
          description:
            "Optional content ID, path, or YouTube video ID. Omit to list all synced retention windows.",
          type: "string",
        },
      },
      type: "object",
    },
    name: "analytics_get_retention",
  },
  {
    description:
      "Compare old/remake/version candidates by explicit ids or a search query, including analytics and content differences.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        ids: {
          description:
            "Explicit content IDs, paths, or YouTube video IDs to compare.",
          items: { type: "string" },
          type: "array",
        },
        limit: {
          default: 10,
          description: "Maximum number of versions to return. 1-100.",
          maximum: 100,
          minimum: 1,
          type: "integer",
        },
        q: {
          description:
            "Search query to find possible versions when ids are not provided.",
          type: "string",
        },
      },
      type: "object",
    },
    name: "analysis_compare_versions",
  },
  {
    description:
      "List content records with missing fields that limit analytics or AI analysis, grouped by missing YouTube, subtitles, style, basics, and analytics.",
    inputSchema: { additionalProperties: false, type: "object" },
    name: "content_list_missing_fields",
  },
  {
    annotations: {
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
      readOnlyHint: false,
    },
    description:
      "Write tool: actively sync Sovia YouTube analytics data from YouTube Data API and YouTube Analytics API into the database. This consumes YouTube API quota and requires confirmQuotaUse=true.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        metadataOnly: {
          type: "boolean",
          description:
            "Fill only unknown duration and vocal language from YouTube defaultAudioLanguage; no Analytics reports or realtime writes. Cannot combine with recovery modes.",
        },
        geographyOnly: {
          type: "boolean",
          default: false,
          description:
            "Recover missing geography only, skipping fresh cached periods. Requires a fresh channel cutoff; at most ONE Analytics request. Cannot be combined with resumeAfterDaily.",
        },
        resumeAfterDaily: {
          type: "boolean",
          default: false,
          description:
            "Resume only remaining stages after a fresh failed-run daily checkpoint. Skips Data API statistics and all daily report requests; other existing stage limits remain unchanged.",
        },
        confirmQuotaUse: {
          description:
            "Must be true to confirm the caller understands this consumes YouTube API quota.",
          type: "boolean",
        },
      },
      required: ["confirmQuotaUse"],
      type: "object",
    },
    name: "analytics_sync_youtube",
  },
  {
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      readOnlyHint: false,
    },
    description:
      "Write tool: incrementally sync channel-wide top-level YouTube comments. Each page contains up to 100 threads and costs 1 YouTube quota unit. Existing syncs stop after reaching the previous newest comment, and unfinished runs resume from a saved page cursor.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        confirmQuotaUse: {
          description:
            "Must be true to confirm the caller understands this consumes YouTube API quota.",
          type: "boolean",
        },
        maxPages: {
          description:
            "Optional hard cap from 1-25 pages. Defaults to 3 for incremental sync or 10 for the initial backfill.",
          maximum: 25,
          minimum: 1,
          type: "integer",
        },
      },
      required: ["confirmQuotaUse"],
      type: "object",
    },
    name: "analytics_sync_youtube_comments",
  },
];

const tools: ToolDefinition[] = toolDefinitions.map((tool) => ({
  ...tool,
  annotations: tool.annotations ?? readOnlyToolAnnotations,
  outputSchema: defaultOutputSchema,
}));

export async function OPTIONS() {
  return new Response(null, {
    headers: getCorsHeaders(),
    status: 204,
  });
}

export async function GET() {
  let policy: Awaited<ReturnType<typeof getMcpSettings>>;
  try {
    policy = await getMcpSettings();
  } catch {
    return jsonResponse(
      { message: "MCP configuration unavailable." },
      { status: 503 },
    );
  }
  const available = tools.filter((tool) =>
    canUseMcpTool(policy, ["read", "write", "sync"], tool.name),
  );
  return jsonResponse({
    enabled: policy.enabled,
    oauthEnabled: policy.allowOAuth,
    endpoint: "/api/admin/mcp",
    version: SERVER_VERSION,
    message:
      "Sovia Admin MCP is a JSON-RPC MCP endpoint. Send POST requests with MCP methods such as initialize, tools/list, and tools/call.",
    oauth: getMcpOAuthServerInfo(),
    readonlyTools: available
      .filter((tool) => tool.annotations?.readOnlyHint !== false)
      .map((tool) => tool.name),
    tools: available.map((tool) => tool.name),
    writableTools: available
      .filter((tool) => tool.annotations?.readOnlyHint === false)
      .map((tool) => tool.name),
  });
}

export async function POST(request: Request) {
  let access: McpAccess | null;
  try {
    access = await authenticateMcp(request);
    if (access && !(await allowRequest("mcp-request", access.actor, 120, 60)))
      return jsonResponse({ message: "Too many requests." }, { status: 429 });
  } catch {
    return jsonResponse(
      { message: "MCP configuration unavailable." },
      { status: 503 },
    );
  }
  if (!access)
    return jsonResponse(
      { message: "Unauthorized or MCP disabled." },
      { status: 401, headers: getMcpUnauthorizedHeaders(request) },
    );

  let body: unknown;
  try {
    body = await readMcpRequestJson(request);
  } catch (error) {
    if (error instanceof RangeError)
      return jsonResponse(
        { message: "Request exceeds 4 MiB." },
        { status: 413 },
      );
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (Array.isArray(body)) {
    if (!body.length || body.length > 20)
      return jsonRpcError(null, -32600, "Batch size must be 1–20.");
    const results = [];
    for (const entry of body) results.push(await handleRequest(entry, access));
    const visibleResults = results.filter(Boolean);
    if (!visibleResults.length) {
      return new Response(null, { headers: getCorsHeaders(), status: 202 });
    }
    return jsonResponse(visibleResults);
  }

  const result = await handleRequest(body, access);
  if (!result) {
    return new Response(null, { headers: getCorsHeaders(), status: 202 });
  }
  return jsonResponse(result);
}

async function handleRequest(body: unknown, access: McpAccess) {
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
          version: SERVER_VERSION,
        },
      });

    case "ping":
      return makeJsonRpcResult(id, {});

    case "tools/list":
      return makeJsonRpcResult(id, {
        tools: tools.filter((tool) =>
          canUseMcpTool(access.policy, access.permissions, tool.name),
        ),
      });

    case "tools/call":
      return handleToolCall(id, request.params, access);

    default:
      return makeJsonRpcError(
        id,
        -32601,
        `Method not found: ${request.method}`,
      );
  }
}

async function handleToolCall(
  id: JsonRpcRequest["id"],
  params: unknown,
  access: McpAccess,
) {
  const call = params as { arguments?: unknown; name?: string };
  const args = (call?.arguments ?? {}) as Record<string, unknown>;

  if (!call?.name || !tools.some((tool) => tool.name === call.name))
    return makeJsonRpcError(id, -32602, "Unknown tool.");
  if (!canUseMcpTool(access.policy, access.permissions, call.name))
    return makeJsonRpcError(
      id,
      -32003,
      "Tool permission denied. Check Admin MCP permissions and OAuth scopes.",
    );
  try {
    switch (call?.name) {
      case "content_get_editable_work":
        return makeToolResult(
          id,
          await getMcpEditableMusic(getRequiredString(args, "contentId")),
        );
      case "content_update_work":
      case "content_create_work":
        return makeToolResult(
          id,
          await writeMcpMusic(
            args,
            access.actor,
            call.name === "content_create_work",
          ),
        );
      case "analysis_score_song_candidate":
        return makeToolResult(
          id,
          await getSongCandidateIntelligence({
            title: getRequiredString(args, "title"),
            sourceTitle: toOptionalString(args.sourceTitle),
            artist: toOptionalString(args.artist),
            ip: toOptionalString(args.ip),
            series: toOptionalString(args.series),
            workType: toOptionalString(args.workType),
            vocalLanguages: toOptionalString(args.vocalLanguages),
            durationSeconds: toOptionalString(args.durationSeconds),
            hours: toInteger(args.hours, 168),
            allowRemake: args.allowRemake === true,
          }),
        );
      case "analytics_channel_trends":
        return makeToolResult(
          id,
          await getChannelIntelligence({
            days: toInteger(args.days, 28),
            start: toOptionalString(args.start),
            end: toOptionalString(args.end),
          }),
        );
      case "analytics_content_strategy":
        return makeToolResult(
          id,
          await getContentStrategy(
            [24, 72, 168, 672].includes(toInteger(args.hours, 168))
              ? toInteger(args.hours, 168)
              : 168,
          ),
        );
      case "analytics_audience_geography":
        return makeToolResult(id, await getAudienceIntelligence());
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

      case "analytics_compare_cohort": {
        const comparison = await compareAdminMcpAnalyticsCohort({
          hours: [24, 72, 168, 672].includes(toInteger(args.hours, 168))
            ? toInteger(args.hours, 168)
            : 168,
          cohort: getCohortArg(args.cohort),
          matchDuration: args.matchDuration === true,
          id: getRequiredString(args, "id"),
          limit: toInteger(args.limit, 10),
        });
        return makeToolResult(
          id,
          comparison ?? { error: "Work analytics not found." },
        );
      }

      case "analytics_get_early_performance":
        return makeToolResult(
          id,
          await getAdminMcpEarlyPerformance({
            id: toOptionalString(args.id),
          }),
        );

      case "analytics_get_traffic_sources":
        return makeToolResult(
          id,
          await getAdminMcpTrafficSources({
            id: toOptionalString(args.id),
            periodDays: toInteger(args.periodDays, 90),
          }),
        );

      case "comments_list":
      case "analytics_list_youtube_comments":
        return makeToolResult(
          id,
          await getAdminMcpYoutubeComments({
            hideOwn: toOptionalBoolean(args.hideOwn) ?? true,
            hideReplied: toOptionalBoolean(args.hideReplied) ?? true,
            id: toOptionalString(args.id),
            limit: toInteger(args.limit, 20),
            offset: toInteger(args.offset, 0),
            q: toOptionalString(args.q),
            sort: getYoutubeCommentSort(args.sort),
          }),
        );

      case "analytics_get_retention":
        return makeToolResult(
          id,
          await getAdminMcpRetention({
            elapsedHours: args.elapsedHours
              ? toInteger(args.elapsedHours, 168)
              : undefined,
            id: toOptionalString(args.id),
          }),
        );

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

      case "content_check_duplicate":
        return makeToolResult(
          id,
          await checkAdminMcpContentDuplicate(getDuplicateCheckArgs(args)),
        );

      case "content_get_recent_works":
        return makeToolResult(
          id,
          await getAdminMcpRecentWorks({
            hasYoutube: toOptionalBoolean(args.hasYoutube),
            limit: toInteger(args.limit, 20),
            offset: toInteger(args.offset, 0),
          }),
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

      case "analysis_compare_versions":
        return makeToolResult(
          id,
          await compareAdminMcpVersions(getVersionCompareArgs(args)),
        );

      case "content_list_missing_fields":
        return makeToolResult(id, await listAdminMcpMissingContentFields());

      case "analytics_sync_youtube":
        if (args.confirmQuotaUse !== true) {
          throw new Error(
            "analytics_sync_youtube requires confirmQuotaUse=true because it consumes YouTube API quota.",
          );
        }
        return makeToolResult(
          id,
          await syncAdminYoutubeAnalytics({
            resumeAfterDaily: args.resumeAfterDaily === true,
            geographyOnly: args.geographyOnly === true,
            metadataOnly: args.metadataOnly === true,
          }),
        );

      case "analytics_sync_youtube_comments":
        if (args.confirmQuotaUse !== true) {
          throw new Error(
            "analytics_sync_youtube_comments requires confirmQuotaUse=true because it consumes YouTube API quota.",
          );
        }
        return makeToolResult(
          id,
          await syncAdminYoutubeComments({
            maxPages: args.maxPages ? toInteger(args.maxPages, 3) : undefined,
          }),
        );

      default:
        return makeJsonRpcError(
          id,
          -32602,
          `Unknown tool: ${call?.name ?? "(missing)"}`,
        );
    }
  } catch (error) {
    const message =
      error && typeof error === "object" && "code" in error
        ? "Database conflict or operation unavailable. Reread the work before retrying."
        : error instanceof Error
          ? error.message
          : "Tool call failed.";
    return makeJsonRpcResult(id, {
      isError: true,
      content: [{ type: "text", text: message }],
      structuredContent: { error: message },
    });
  }
}

function getPaginationArgs(args: Record<string, unknown>) {
  return {
    limit: toInteger(args.limit, 50),
    matchMode: getSearchMatchMode(args.matchMode),
    offset: toInteger(args.offset, 0),
  };
}

function getSearchMatchMode(value: unknown) {
  return value === "lexical" || value === "semantic" || value === "hybrid"
    ? value
    : undefined;
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

function getDuplicateCheckArgs(args: Record<string, unknown>) {
  return {
    artist: toOptionalString(args.artist),
    ip: toOptionalString(args.ip),
    limit: toInteger(args.limit, 20),
    q: toOptionalString(args.q),
    sourceTitle: toOptionalString(args.sourceTitle),
    title: toOptionalString(args.title),
  };
}

function getVersionCompareArgs(args: Record<string, unknown>) {
  return {
    ids: Array.isArray(args.ids)
      ? args.ids.filter((item): item is string => typeof item === "string")
      : undefined,
    limit: toInteger(args.limit, 10),
    q: toOptionalString(args.q),
  };
}

function getCohortArg(value: unknown) {
  return value === "recent" ||
    value === "sameLanguage" ||
    value === "sameSourceIp" ||
    value === "sameSourceType" ||
    value === "sameStyle" ||
    value === "sameVocalLanguage" ||
    value === "similarDuration"
    ? value
    : undefined;
}

function getYoutubeCommentSort(value: unknown) {
  return value === "oldest" ||
    value === "mostLiked" ||
    value === "mostReplies" ||
    value === "newest"
    ? value
    : undefined;
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
  const structuredContent = toStructuredContent(data);

  return makeJsonRpcResult(id, {
    content: [
      {
        text: JSON.stringify(structuredContent, null, 2),
        type: "text",
      },
    ],
    structuredContent,
  });
}

function toStructuredContent(data: unknown): Record<string, unknown> {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return { value: data };
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
