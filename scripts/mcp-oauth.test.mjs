// Run after the additive OAuth migration. Only uniquely prefixed fixtures are written.
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (
      specifier === "@sovia/admin/data/auth" &&
      context.parentURL?.endsWith("/mcp/oauth/authorize/route.ts")
    ) {
      return {
        url: "data:text/javascript,export const isAdminAuthenticated=async()=>false;export const requireAuditActor=()=>{throw Error('Unexpected authenticated call')}",
        shortCircuit: true,
      };
    }
    if (specifier === "@sovia/shared") specifier = "@/shared/config/site";
    if (["next/server", "next/headers"].includes(specifier))
      return next(`${specifier}.js`, context);
    let target;
    if (specifier.startsWith("@/")) target = `${root}src/${specifier.slice(2)}`;
    else if (specifier.startsWith("@sovia/"))
      target = `${root}src/features/${specifier.slice(7)}`;
    else if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:")
    )
      target = fileURLToPath(new URL(specifier, context.parentURL));
    if (target) {
      const file = [target, `${target}.ts`, `${target}/index.ts`].find(
        (path) => existsSync(path) && /\.ts$/.test(path),
      );
      if (file) return next(pathToFileURL(file).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (
      url.startsWith("file:") &&
      url.endsWith(".json") &&
      !url.includes("node_modules")
    ) {
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
      };
    }
    if (
      url.startsWith("file:") &&
      url.endsWith(".ts") &&
      !url.includes("node_modules")
    )
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    return next(url, context);
  },
});
if (existsSync(`${root}.env`)) loadEnvFile(`${root}.env`);
process.env.SOVIA_ADMIN_MCP_OAUTH_SECRET = randomBytes(32).toString("hex");
process.env.SOVIA_ADMIN_MCP_OAUTH_REDIRECT_URIS = "";
const siteOrigin = "https://sovia.example.test";
process.env.SITE_URL = siteOrigin;
const { NextRequest } = await import("next/server");
const oauth = await import("../src/features/admin/data/mcp-oauth.ts");
const { getPrismaClient } = await import(
  "../src/features/sound/data/prisma.ts"
);
const endpoint = `${siteOrigin}/api/admin/mcp`;
const callback = "http://127.0.0.1:17551/callback/desktop";
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
function post(path, data, headers = {}) {
  return new NextRequest(`${endpoint}/oauth/${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(data),
  });
}

test("signed-out OAuth login retains the verbatim loopback return address", async () => {
  const { GET } = await import(
    "../src/app/api/admin/mcp/oauth/authorize/route.ts"
  );
  const original = new URL(`${endpoint}/oauth/authorize`);
  original.searchParams.set("redirect_uri", callback);
  original.searchParams.set("state", "fixture-state");
  const redirect = await GET(new NextRequest(original));
  const login = new URL(redirect.headers.get("location"));
  assert.equal(login.origin, siteOrigin);
  assert.equal(login.pathname, "/admin");
  assert.equal(
    login.searchParams.get("next"),
    original.pathname + original.search,
  );
});

test("OAuth callback and PKCE validation reject malicious redirects and weak requests", async () => {
  for (const value of [
    "http://127.attacker.example/callback",
    "http://localhost.attacker.example/callback",
    "https://chatgpt.com.attacker.example/connector/oauth/callback",
    "https://chatgpt.com@attacker.example/connector/oauth/callback",
    "http://127.0.0.1/callback#token",
    "http://127.0.0.1/callback?next=https://evil.example",
    "https://chatgpt.com/connector/oauth/a/../../redirect",
    "javascript:alert(1)",
  ])
    assert.equal(oauth.isAllowedMcpRedirectUri(value), false, value);
  for (const value of [
    callback,
    "http://localhost:1234/oauth/callback",
    "http://[::1]:1234/callback",
    "https://chatgpt.com/connector/oauth/example-callback",
    "https://chatgpt.com/connector_platform_oauth_redirect",
  ])
    assert.equal(oauth.isAllowedMcpRedirectUri(value), true, value);
  const metadata = oauth.getMcpOAuthMetadata(new NextRequest(endpoint));
  assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
  assert.equal(metadata.authorization_response_iss_parameter_supported, true);
  assert.equal(metadata.registration_endpoint, `${endpoint}/oauth/register`);
  assert.equal(
    await oauth.authenticateMcpAccessToken("old.signed-token"),
    null,
  );
  const params = {
    client_id: process.env.SOVIA_ADMIN_MCP_OAUTH_CLIENT_ID || "chatgpt-mcp",
    redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
    response_type: "code",
    resource: endpoint,
  };
  await assert.rejects(
    oauth.parseMcpAuthorization(
      new NextRequest(
        `${endpoint}/oauth/authorize?${new URLSearchParams(params)}`,
      ),
    ),
    /S256/,
  );
  await assert.rejects(
    oauth.parseMcpAuthorization(
      new NextRequest(
        `${endpoint}/oauth/authorize?${new URLSearchParams({ ...params, code_challenge: challenge, code_challenge_method: "plain" })}`,
      ),
    ),
    /S256/,
  );
  await assert.rejects(
    oauth.parseMcpAuthorization(
      new NextRequest(
        `${endpoint}/oauth/authorize?${new URLSearchParams({ ...params, code_challenge: challenge, code_challenge_method: "S256", scope: "admin:all" })}`,
      ),
    ),
    /unsupported scope/,
  );
});

test(
  "OAuth consent, one-time codes, scoped credentials, refresh rotation and revocation are persisted",
  { timeout: 120000 },
  async () => {
    const db = getPrismaClient();
    const actor = `oauth-test-${randomUUID()}`;
    let clientId;
    try {
      const registration = await oauth.registerMcpOAuthClient(
        new NextRequest(`${endpoint}/oauth/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_name: actor,
            redirect_uris: [callback],
            token_endpoint_auth_method: "none",
          }),
        }),
      );
      assert.equal(registration.status, 201);
      clientId = (await registration.json()).client_id;
      const params = {
        client_id: clientId,
        redirect_uri: callback,
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "mcp:read mcp:draft mcp:review offline_access",
        state: "preserved-state",
        resource: endpoint,
      };
      const wrongHost = new URL(callback);
      wrongHost.hostname = "localhost";
      const wrongRequest = new NextRequest(
        `${endpoint}/oauth/authorize?${new URLSearchParams({ ...params, redirect_uri: wrongHost.href })}`,
      );
      const rejected = await oauth.renderMcpOAuthConsent(wrongRequest, actor);
      assert.equal(rejected.status, 400);
      assert.equal(rejected.headers.get("set-cookie"), null);
      assert.match((await rejected.json()).error_description, /exact callback/);
      async function approve() {
        const session = randomBytes(24).toString("hex");
        const request = new NextRequest(
          `${endpoint}/oauth/authorize?${new URLSearchParams(params)}`,
          { headers: { cookie: `sovia-admin=${session}` } },
        );
        const rendered = await oauth.renderMcpOAuthConsent(request, actor);
        assert.equal(rendered.status, 200);
        assert.equal(rendered.headers.get("referrer-policy"), "same-origin");
        assert.ok(
          rendered.headers
            .get("content-security-policy")
            .includes(`form-action 'self' ${new URL(callback).origin};`),
        );
        assert.equal(rendered.headers.get("location"), null);
        const html = await rendered.text();
        assert.match(html, /Allow selected permissions/);
        const consent = /name="consent" value="([^"]+)"/.exec(html)[1];
        const nonceCookie = rendered.headers.get("set-cookie").split(";")[0];
        const headers = {
          origin: siteOrigin,
          cookie: `sovia-admin=${session}; ${nonceCookie}`,
        };
        const data = new URLSearchParams({ consent, decision: "approve" });
        for (const scope of ["mcp:read", "mcp:draft", "offline_access"])
          data.append("scope", scope);
        const denied = await oauth.approveMcpOAuthConsent(
          post("authorize", data, {
            ...headers,
            origin: "https://evil.example",
          }),
          actor,
        );
        assert.equal(denied.status, 400);
        const escalated = new URLSearchParams(data);
        escalated.append("scope", "mcp:publish");
        assert.equal(
          (
            await oauth.approveMcpOAuthConsent(
              post("authorize", escalated, headers),
              actor,
            )
          ).status,
          400,
        );
        const approved = await oauth.approveMcpOAuthConsent(
          post("authorize", data, headers),
          actor,
        );
        assert.equal(approved.status, 303);
        const location = new URL(approved.headers.get("location"));
        assert.equal(location.searchParams.get("state"), "preserved-state");
        assert.equal(location.searchParams.get("iss"), siteOrigin);
        assert.equal(location.origin + location.pathname, callback);
        assert.equal(
          (
            await oauth.approveMcpOAuthConsent(
              post("authorize", data, headers),
              actor,
            )
          ).status,
          400,
        );
        return location.searchParams.get("code");
      }
      const code = await approve();
      const exchangeData = {
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        redirect_uri: callback,
        code_verifier: verifier,
        resource: endpoint,
      };
      assert.equal(
        (
          await oauth.handleMcpOAuthTokenRequest(
            post("token", { ...exchangeData, code_verifier: "a".repeat(43) }),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await oauth.handleMcpOAuthTokenRequest(
            post("token", {
              ...exchangeData,
              resource: "https://other.example/mcp",
            }),
          )
        ).status,
        400,
      );
      const concurrent = await Promise.all([
        oauth.handleMcpOAuthTokenRequest(post("token", exchangeData)),
        oauth.handleMcpOAuthTokenRequest(post("token", exchangeData)),
      ]);
      assert.deepEqual(
        concurrent.map((response) => response.status).sort(),
        [200, 400],
      );
      const tokens = await concurrent
        .find((response) => response.status === 200)
        .json();
      const principal = await oauth.authenticateMcpAccessToken(
        tokens.access_token,
      );
      assert.equal(principal.actor, actor);
      assert.deepEqual(principal.scopes, [
        "mcp:read",
        "mcp:draft",
        "offline_access",
      ]);
      assert.equal(principal.scopes.includes("mcp:review"), false);
      const stored = await db.mcpOAuthToken.findMany({
        where: { connectionId: principal.id },
      });
      assert.equal(
        stored.some(
          (token) =>
            token.hash === tokens.access_token ||
            token.hash === tokens.refresh_token,
        ),
        false,
      );
      const refreshData = {
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: clientId,
        resource: endpoint,
      };
      const refreshed = await oauth.handleMcpOAuthTokenRequest(
        post("token", refreshData),
      );
      assert.equal(refreshed.status, 200);
      const next = await refreshed.json();
      assert.notEqual(next.refresh_token, tokens.refresh_token);
      assert.ok(await oauth.authenticateMcpAccessToken(next.access_token));
      assert.equal(
        (await oauth.handleMcpOAuthTokenRequest(post("token", refreshData)))
          .status,
        400,
      );
      assert.equal(
        await oauth.authenticateMcpAccessToken(next.access_token),
        null,
      );
      assert.equal(
        (
          await oauth.handleMcpOAuthTokenRequest(
            post("token", {
              ...refreshData,
              refresh_token: next.refresh_token,
            }),
          )
        ).status,
        400,
      );
      assert.equal(
        await db.reviewAuditEvent.count({
          where: {
            entityId: principal.id,
            action: "MCP_REFRESH_REUSE_REVOKED",
          },
        }),
        1,
      );
      const otherCode = await approve();
      const other = await (
        await oauth.handleMcpOAuthTokenRequest(
          post("token", { ...exchangeData, code: otherCode }),
        )
      ).json();
      const otherPrincipal = await oauth.authenticateMcpAccessToken(
        other.access_token,
      );
      await assert.rejects(
        oauth.revokeMcpConnection(otherPrincipal.id, `${actor}-other`),
        /not found/,
      );
      await oauth.revokeMcpConnection(otherPrincipal.id, actor);
      assert.equal(
        await oauth.authenticateMcpAccessToken(other.access_token),
        null,
      );
    } finally {
      const connections = await db.mcpOAuthConnection.findMany({
        where: { actor },
        select: { id: true },
      });
      await db.reviewAuditEvent.deleteMany({
        where: {
          entityType: "MCP",
          entityId: { in: connections.map((connection) => connection.id) },
        },
      });
      await db.mcpOAuthConnection.deleteMany({ where: { actor } });
      if (clientId)
        await db.mcpOAuthClient.deleteMany({
          where: { id: clientId, name: actor },
        });
      await db.$disconnect();
    }
  },
);

test("Google sign-in preserves a nested MCP loopback callback through a local return path", async () => {
  const { getGoogleAdminLoginReturnPath, getSafeGoogleAdminReturnPath } =
    await import("../src/features/admin/data/google-oauth.ts");
  const site = "https://sovia.work";
  const params = new URLSearchParams({ redirect_uri: callback });
  const authorizePath = `/api/admin/mcp/oauth/authorize?${params}`;
  const loginLink = new URL("/admin/login/google", site);
  loginLink.searchParams.set("next", authorizePath);
  const saved = getGoogleAdminLoginReturnPath(new NextRequest(loginLink));
  assert.equal(saved, authorizePath);
  const destination = new URL(getSafeGoogleAdminReturnPath(saved), site);
  assert.equal(destination.origin, site);
  assert.equal(destination.pathname, "/api/admin/mcp/oauth/authorize");
  assert.equal(destination.searchParams.get("redirect_uri"), callback);
  assert.equal(getSafeGoogleAdminReturnPath("/admin/review"), "/admin/review");
  for (const external of ["https://outside.example", "//outside.example"]) {
    loginLink.searchParams.set("next", external);
    assert.equal(
      getGoogleAdminLoginReturnPath(new NextRequest(loginLink)),
      undefined,
    );
    assert.equal(getSafeGoogleAdminReturnPath(external), undefined);
  }
});
