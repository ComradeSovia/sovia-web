import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { SITE_NAME } from "@sovia/shared";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getAdminRequestOrigin } from "./admin-url";
import { ADMIN_SESSION_COOKIE_NAME } from "./auth";

const ACCESS_TTL = 3600;
const REFRESH_TTL = 30 * 86400;
const CONNECTION_TTL = 90 * 86400;
const CONSENT_COOKIE = "sovia-mcp-consent";
// The SSH-backed database can take longer than Prisma's 2 s default to acquire
// a second connection. Keep both pool waiting and execution explicitly bounded.
const OAUTH_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 15_000 };
export const MCP_SCOPES = [
  "mcp:read",
  "mcp:sync",
  "mcp:draft",
  "mcp:review",
  "mcp:publish",
] as const;
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "mcp:read":
    "Read private works, analytics, recommendations, source conversations, comments and audit history.",
  "mcp:sync":
    "Refresh YouTube data and reply status. These actions use API quota and update stored data.",
  "mcp:draft":
    "Save reviewed AI drafts and proposed edits. Generation may use AI services and quota.",
  "mcp:review":
    "Approve recommendations, merge sources, link works, review replies and undo merges after confirmation.",
  "mcp:publish":
    "Publish, hide or change publicly displayed plans and their Work links after confirmation. The operation also requires its draft or review permission.",
  offline_access:
    "Keep this connection signed in with rotating refresh tokens (up to 90 days).",
};
export type McpPrincipal = { id: string; actor: string; scopes: string[] };
type Authorization = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  resource: string;
  challenge: string;
  scopes: string[];
  state: string;
};
type Consent = Authorization & {
  actor: string;
  sessionHash: string;
  nonce: string;
  expiresAt: number;
};
type Connection = {
  id: string;
  actor: string;
  clientId: string;
  clientName: string;
  redirectUri: string;
  resource: string;
  scopes: string[];
  expiresAt: Date;
  revokedAt: Date | null;
};
function db() {
  const client = getPrismaClient();
  if (!client) throw new Error("Database is unavailable.");
  return client;
}
function env(name: string) {
  return process.env[name]?.trim() || "";
}
function secret() {
  return (
    env("SOVIA_ADMIN_MCP_OAUTH_SECRET") ||
    env("SOVIA_ADMIN_SESSION_SECRET") ||
    env("SOVIA_ADMIN_MCP_API_KEY")
  );
}
function clientId() {
  return env("SOVIA_ADMIN_MCP_OAUTH_CLIENT_ID") || "chatgpt-mcp";
}
function origin(request?: Request) {
  // Production issuer/audience must not trust arbitrary forwarded headers.
  return getAdminRequestOrigin(
    process.env.NODE_ENV === "production" ? undefined : request,
  );
}
function resource(request?: Request) {
  return `${origin(request)}/api/admin/mcp`;
}
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function random(prefix: string) {
  return `${prefix}${randomBytes(32).toString("base64url")}`;
}
function same(left: string, right: string) {
  const a = Buffer.from(left),
    b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}
function invalid(description = "The OAuth request is invalid.") {
  return json(
    { error: "invalid_request", error_description: description },
    400,
  );
}
function formValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function boundedBody(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length") || 0) > maximum)
    throw new Error("Request body is too large.");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > maximum) {
      await reader.cancel();
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function boundedForm(request: Request, maximum: number) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/x-www-form-urlencoded")
  )
    throw new Error("URL-encoded form data is required.");
  const form = new FormData();
  for (const [key, value] of new URLSearchParams(
    await boundedBody(request, maximum),
  ))
    form.append(key, value);
  return form;
}

export function isAllowedMcpRedirectUri(value: string) {
  if (value.length > 2000) return false;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash || url.search) return false;
    if (
      url.protocol === "https:" &&
      url.hostname === "chatgpt.com" &&
      !url.port
    ) {
      return (
        url.pathname === "/connector_platform_oauth_redirect" ||
        /^\/connector\/oauth\/[A-Za-z0-9_-]+$/.test(url.pathname)
      );
    }
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      /^\/(?:callback|oauth\/callback|auth\/callback)(?:\/[A-Za-z0-9_-]{1,100})?$/.test(
        url.pathname,
      )
    );
  } catch {
    return false;
  }
}
async function resolveClient(id: string, redirectUri: string) {
  if (!isAllowedMcpRedirectUri(redirectUri)) return null;
  if (id === clientId()) {
    const configured = env("SOVIA_ADMIN_MCP_OAUTH_REDIRECT_URIS")
      .split(/\s+/)
      .filter(Boolean);
    if (configured.length && !configured.includes(redirectUri)) return null;
    // Local clients register their exact callback with DCR.
    if (new URL(redirectUri).protocol !== "https:") return null;
    return { id, name: "Preconfigured ChatGPT connection" };
  }
  const client = await db().mcpOAuthClient.findUnique({ where: { id } });
  return client?.redirectUris.some((registered) => {
    if (registered === redirectUri) return true;
    const expected = new URL(registered),
      actual = new URL(redirectUri);
    // RFC 8252 loopback ports are chosen when the local OAuth listener starts.
    return (
      expected.protocol === "http:" &&
      expected.hostname === "127.0.0.1" &&
      !expected.port &&
      actual.protocol === expected.protocol &&
      actual.hostname === expected.hostname &&
      actual.pathname === expected.pathname
    );
  })
    ? client
    : null;
}
export async function parseMcpAuthorization(
  request: NextRequest,
): Promise<Authorization> {
  const params = request.nextUrl.searchParams;
  if (!secret()) throw new Error("OAuth is not configured.");
  const redirectUri = params.get("redirect_uri") || "";
  const id = params.get("client_id") || "";
  if (!id || id.length > 300)
    throw new Error("An explicitly registered client_id is required.");
  const client = await resolveClient(id, redirectUri);
  if (!client)
    throw new Error("The client and exact callback URI are not allowed.");
  if (params.get("response_type") !== "code")
    throw new Error("Only response_type=code is supported.");
  const challenge = params.get("code_challenge") || "";
  if (
    params.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge)
  )
    throw new Error("PKCE with a valid S256 challenge is required.");
  const audience = resource(request);
  if (params.has("resource") && params.get("resource") !== audience)
    throw new Error("The requested resource does not match this MCP server.");
  const scopes = [
    ...new Set(
      (params.get("scope") || "mcp:read").split(/\s+/).filter(Boolean),
    ),
  ];
  if (scopes.some((scope) => !Object.hasOwn(SCOPE_DESCRIPTIONS, scope)))
    throw new Error("An unsupported scope was requested.");
  if (!scopes.includes("mcp:read")) scopes.unshift("mcp:read");
  const state = params.get("state") || "";
  if (state.length > 2000) throw new Error("OAuth state is too long.");
  return {
    clientId: id,
    clientName: client.name,
    redirectUri,
    resource: audience,
    challenge,
    scopes,
    state,
  };
}
function signConsent(value: Consent) {
  const encoded = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret()).update(encoded).digest("base64url")}`;
}
function readConsent(value: string): Consent | null {
  if (value.length > 16000 || !secret()) return null;
  const [encoded, signature, extra] = value.split(".");
  if (
    !encoded ||
    !signature ||
    extra !== undefined ||
    !same(
      signature,
      createHmac("sha256", secret()).update(encoded).digest("base64url"),
    )
  )
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Consent;
    return payload.expiresAt > Date.now() && Array.isArray(payload.scopes)
      ? payload
      : null;
  } catch {
    return null;
  }
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}
export async function renderMcpOAuthConsent(
  request: NextRequest,
  actor: string,
) {
  let authorization: Authorization;
  try {
    authorization = await parseMcpAuthorization(request);
  } catch (error) {
    return invalid(error instanceof Error ? error.message : undefined);
  }
  const nonce = random("consent_");
  const session = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value || "";
  const consent = signConsent({
    ...authorization,
    actor,
    sessionHash: hash(session),
    nonce,
    expiresAt: Date.now() + 600_000,
  });
  const scopes = authorization.scopes
    .map(
      (scope) =>
        `<label class="scope"><input type="checkbox" name="scope" value="${escapeHtml(scope)}" checked ${scope === "mcp:read" ? "disabled" : ""}><span><strong>${escapeHtml(scope)}</strong><br>${escapeHtml(SCOPE_DESCRIPTIONS[scope])}</span></label>`,
    )
    .join("");
  const response = new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize MCP · Sovia</title><style>body{color:#eee;background:#09090b;font:16px/1.6 system-ui;margin:0;padding:32px 20px}main{max-width:720px;margin:0 auto}h1{font-size:28px}p{color:#a1a1aa}code{overflow-wrap:anywhere}.box{border:1px solid #3f3f46;border-radius:12px;padding:20px;margin:24px 0}.scope{display:flex;gap:12px;margin:18px 0}.scope input{margin-top:8px}button{font:inherit;border-radius:8px;padding:10px 20px;cursor:pointer;border:1px solid #52525b;margin-right:10px;background:#27272a;color:white}button[value=approve]{background:#e4e4e7;color:#18181b}.notice{color:#fbbf24}</style></head><body><main><p>SOVIA / PRIVATE ADMINISTRATION</p><h1>Authorize this MCP connection</h1><p>Review who receives access and which actions you allow. Only approve a connection you just started in ChatGPT or Codex.</p><div class="box"><strong>Application name (provided by the client)</strong><p>${escapeHtml(authorization.clientName)}</p><strong>Callback</strong><p><code>${escapeHtml(authorization.redirectUri)}</code></p><strong>Signed in as</strong><p>${escapeHtml(actor)}</p></div><form method="post" action="/api/admin/mcp/oauth/authorize"><input type="hidden" name="consent" value="${escapeHtml(consent)}"><input type="hidden" name="scope" value="mcp:read">${scopes}<p class="notice">Private source text and unpublished work may be shared with the connected application. Review writes require a separate preview and confirmation. Replies are never posted automatically.</p><button type="submit" name="decision" value="approve">Allow selected permissions</button><button type="submit" name="decision" value="deny">Cancel</button></form><p>Manage or revoke this connection later at /admin/mcp. Older MCP sign-ins must reconnect after the security upgrade.</p></main></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        // Keep the Origin on our same-origin confirmation POST; suppress
        // cross-origin referrers when returning to the OAuth client.
        "Referrer-Policy": "same-origin",
        "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${new URL(authorization.redirectUri).origin}; frame-ancestors 'none'; base-uri 'none'`,
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
  response.cookies.set(CONSENT_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin/mcp/oauth/authorize",
    maxAge: 600,
  });
  return response;
}
export async function approveMcpOAuthConsent(
  request: NextRequest,
  actor: string,
) {
  if (request.headers.get("origin") !== origin(request))
    return invalid("Same-origin confirmation is required.");
  if (Number(request.headers.get("content-length") || 0) > 20000)
    return invalid();
  let form: FormData;
  try {
    form = await boundedForm(request, 20000);
  } catch {
    return invalid();
  }
  const payload = readConsent(formValue(form, "consent"));
  const session = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value || "";
  if (
    !payload ||
    payload.actor !== actor ||
    !session ||
    payload.sessionHash !== hash(session) ||
    !same(payload.nonce, request.cookies.get(CONSENT_COOKIE)?.value || "")
  )
    return invalid(
      "Consent expired or does not belong to this session. Start connecting again.",
    );
  if (
    !(await resolveClient(payload.clientId, payload.redirectUri)) ||
    payload.resource !== resource(request)
  )
    return invalid();
  const callback = new URL(payload.redirectUri);
  callback.searchParams.set("iss", origin(request));
  if (payload.state) callback.searchParams.set("state", payload.state);
  if (formValue(form, "decision") !== "approve")
    callback.searchParams.set("error", "access_denied");
  else {
    const scopes = [
      ...new Set(
        form
          .getAll("scope")
          .filter((value): value is string => typeof value === "string"),
      ),
    ];
    if (
      !scopes.includes("mcp:read") ||
      scopes.some((scope) => !payload.scopes.includes(scope))
    )
      return invalid("Only requested permissions can be approved.");
    const code = random("sovia_code_");
    const now = new Date();
    const id = `mcp_connection_${hash(payload.nonce)}`;
    if (
      await db().mcpOAuthConnection.findUnique({
        where: { id },
        select: { id: true },
      })
    )
      return invalid("This consent has already been used.");
    try {
      await db().$transaction(async (tx) => {
        const connection = await tx.mcpOAuthConnection.create({
          data: {
            id,
            actor,
            clientId: payload.clientId,
            clientName: payload.clientName,
            redirectUri: payload.redirectUri,
            resource: payload.resource,
            scopes,
            expiresAt: new Date(now.getTime() + CONNECTION_TTL * 1000),
            codes: {
              create: {
                hash: hash(code),
                challenge: payload.challenge,
                expiresAt: new Date(now.getTime() + 600_000),
              },
            },
          },
        });
        await auditConnection(tx, connection, actor, "MCP_CONNECTED", {
          scopes,
        });
      }, OAUTH_TRANSACTION_OPTIONS);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return invalid("This consent has already been used.");
      }
      throw error;
    }
    callback.searchParams.set("code", code);
  }
  const response = NextResponse.redirect(callback, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(CONSENT_COOKIE, "", {
    path: "/api/admin/mcp/oauth/authorize",
    maxAge: 0,
  });
  return response;
}
function validConnection(connection: Connection, expectedResource: string) {
  return (
    !connection.revokedAt &&
    connection.expiresAt > new Date() &&
    connection.resource === expectedResource
  );
}
async function auditConnection(
  tx: Prisma.TransactionClient,
  connection: Connection,
  actor: string,
  action: string,
  after: Prisma.InputJsonValue,
) {
  await tx.reviewAuditEvent.create({
    data: {
      actor,
      action,
      entityType: "MCP",
      entityId: connection.id,
      title: connection.clientName,
      before: {},
      after,
      undo: {},
    },
  });
}
async function issueTokens(
  tx: Prisma.TransactionClient,
  connection: Connection,
) {
  const accessToken = random("sovia_at_");
  const now = Date.now();
  const accessExpiry = Math.min(
    now + ACCESS_TTL * 1000,
    connection.expiresAt.getTime(),
  );
  await tx.mcpOAuthToken.create({
    data: {
      hash: hash(accessToken),
      connectionId: connection.id,
      kind: "access",
      expiresAt: new Date(accessExpiry),
    },
  });
  let refreshToken: string | undefined;
  if (connection.scopes.includes("offline_access")) {
    refreshToken = random("sovia_rt_");
    await tx.mcpOAuthToken.create({
      data: {
        hash: hash(refreshToken),
        connectionId: connection.id,
        kind: "refresh",
        expiresAt: new Date(
          Math.min(now + REFRESH_TTL * 1000, connection.expiresAt.getTime()),
        ),
      },
    });
  }
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.max(0, Math.floor((accessExpiry - now) / 1000)),
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
    scope: connection.scopes.join(" "),
  };
}
export async function handleMcpOAuthTokenRequest(request: NextRequest) {
  if (!secret()) return json({ error: "server_error" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 16000)
    return invalid();
  let form: FormData;
  try {
    form = await boundedForm(request, 16000);
  } catch {
    return invalid();
  }
  const audience = resource(request);
  if (form.has("resource") && formValue(form, "resource") !== audience)
    return invalid("The token resource must match this server.");
  const grant = formValue(form, "grant_type");
  if (grant !== "authorization_code" && grant !== "refresh_token")
    return json({ error: "unsupported_grant_type" }, 400);
  const requestedClient = formValue(form, "client_id");
  const code = formValue(form, "code");
  const verifier = formValue(form, "code_verifier");
  const token = formValue(form, "refresh_token");
  if (
    !requestedClient ||
    requestedClient.length > 300 ||
    (grant === "authorization_code" &&
      (!/^sovia_code_[A-Za-z0-9_-]{43}$/.test(code) ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        !isAllowedMcpRedirectUri(formValue(form, "redirect_uri")))) ||
    (grant === "refresh_token" && !/^sovia_rt_[A-Za-z0-9_-]{43}$/.test(token))
  ) {
    return json({ error: "invalid_grant" }, 400);
  }
  const result = await db().$transaction(async (tx) => {
    if (grant === "authorization_code") {
      const record = await tx.mcpOAuthCode.findUnique({
        where: { hash: hash(code) },
        include: { connection: true },
      });
      if (
        !record ||
        record.usedAt ||
        record.expiresAt <= new Date() ||
        !validConnection(record.connection, audience) ||
        formValue(form, "client_id") !== record.connection.clientId ||
        formValue(form, "redirect_uri") !== record.connection.redirectUri ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        !same(
          record.challenge,
          createHash("sha256").update(verifier).digest("base64url"),
        )
      )
        return null;
      const claimed = await tx.mcpOAuthCode.updateMany({
        where: { hash: record.hash, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (!claimed.count) return null;
      return issueTokens(tx, record.connection);
    }
    const record = await tx.mcpOAuthToken.findUnique({
      where: { hash: hash(token) },
      include: { connection: true },
    });
    if (
      !record ||
      record.kind !== "refresh" ||
      !validConnection(record.connection, audience) ||
      formValue(form, "client_id") !== record.connection.clientId
    )
      return null;
    const claimed = await tx.mcpOAuthToken.updateMany({
      where: {
        hash: record.hash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (!claimed.count) {
      if (record.consumedAt || record.expiresAt > new Date()) {
        await tx.mcpOAuthConnection.update({
          where: { id: record.connectionId },
          data: { revokedAt: new Date() },
        });
        await auditConnection(
          tx,
          record.connection,
          "system:oauth",
          "MCP_REFRESH_REUSE_REVOKED",
          { revoked: true },
        );
      }
      return null;
    }
    return issueTokens(tx, record.connection);
  }, OAUTH_TRANSACTION_OPTIONS);
  return result ? json(result) : json({ error: "invalid_grant" }, 400);
}
export async function authenticateMcpAccessToken(
  token: string,
): Promise<McpPrincipal | null> {
  if (!/^sovia_at_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const record = await db().mcpOAuthToken.findUnique({
    where: { hash: hash(token) },
    include: { connection: true },
  });
  if (
    !record ||
    record.kind !== "access" ||
    record.expiresAt <= new Date() ||
    !validConnection(record.connection, resource()) ||
    !record.connection.scopes.includes("mcp:read")
  )
    return null;
  return {
    id: record.connection.id,
    actor: record.connection.actor,
    scopes: record.connection.scopes,
  };
}
export async function revokeMcpConnection(id: string, actor: string) {
  return db().$transaction(async (tx) => {
    const connection = await tx.mcpOAuthConnection.findFirst({
      where: { id, actor },
    });
    if (!connection)
      throw new Error("Connection not found for this administrator.");
    if (!connection.revokedAt) {
      await tx.mcpOAuthConnection.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      await auditConnection(tx, connection, actor, "MCP_REVOKED", {
        revoked: true,
      });
    }
  }, OAUTH_TRANSACTION_OPTIONS);
}
export function listMcpConnections(actor: string) {
  return db().mcpOAuthConnection.findMany({
    where: { actor },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
export async function registerMcpOAuthClient(request: NextRequest) {
  if (!secret()) return json({ error: "server_error" }, 503);
  let raw: string;
  try {
    raw = await boundedBody(request, 8000);
  } catch {
    return invalid();
  }
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return invalid();
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  const redirects = value.redirect_uris;
  if (
    !Array.isArray(redirects) ||
    !redirects.length ||
    redirects.length > 5 ||
    redirects.some(
      (uri) => typeof uri !== "string" || !isAllowedMcpRedirectUri(uri),
    )
  )
    return invalid(
      "Only trusted ChatGPT callbacks or exact local application callbacks can register.",
    );
  if (
    value.token_endpoint_auth_method &&
    value.token_endpoint_auth_method !== "none"
  )
    return invalid("Only public PKCE clients are supported.");
  const redirectUris = [...new Set(redirects as string[])];
  const name =
    typeof value.client_name === "string"
      ? value.client_name.trim().slice(0, 120)
      : "MCP application";
  // Reuse exact public registrations, avoiding duplicate writes on client retries.
  const id = `mcp_client_${hash(JSON.stringify([name, redirectUris.slice().sort()]))}`;
  const existing = await db().mcpOAuthClient.findUnique({
    where: { id },
    select: { id: true },
  });
  if (
    !existing &&
    (await db().mcpOAuthClient.count({
      where: { createdAt: { gt: new Date(Date.now() - 86400_000) } },
    })) >= 100
  )
    return json(
      {
        error: "temporarily_unavailable",
        error_description:
          "Client registration limit reached. Try again later.",
      },
      429,
    );
  await db().mcpOAuthClient.upsert({
    where: { id },
    create: { id, name: name || "MCP application", redirectUris },
    update: {},
  });
  return json(
    {
      client_id: id,
      client_name: name,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    201,
  );
}
export function getMcpOAuthMetadata(request: NextRequest) {
  const issuer = origin(request);
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/admin/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/api/admin/mcp/oauth/token`,
    registration_endpoint: `${issuer}/api/admin/mcp/oauth/register`,
    authorization_response_iss_parameter_supported: true,
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    scopes_supported: [...MCP_SCOPES, "offline_access"],
    token_endpoint_auth_methods_supported: ["none"],
    service_documentation: `${issuer}/admin/mcp`,
  };
}
export function getMcpProtectedResourceMetadata(request: NextRequest) {
  return {
    authorization_servers: [origin(request)],
    resource: resource(request),
    scopes_supported: [...MCP_SCOPES, "offline_access"],
  };
}
export function getMcpUnauthorizedHeaders(request: Request) {
  return {
    "WWW-Authenticate": `Bearer resource_metadata="${origin(request)}/.well-known/oauth-protected-resource"`,
  };
}
export function isMcpOAuthConfigured() {
  return Boolean(secret());
}
export function getMcpOAuthServerInfo() {
  return {
    clientId: clientId(),
    name: SITE_NAME,
    scopes: [...MCP_SCOPES, "offline_access"],
    reconnectRequiredForLegacyTokens: true,
  };
}
