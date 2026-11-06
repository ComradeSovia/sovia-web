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
process.env.SITE_URL = "http://localhost:3000";
const { NextRequest } = await import("next/server");
const oauth = await import("../src/features/admin/data/mcp-oauth.ts");
const { getPrismaClient } = await import(
  "../src/features/sound/data/prisma.ts"
);
const endpoint = "http://localhost:3000/api/admin/mcp";
const callback = "http://127.0.0.1:17551/callback";
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
function post(path, data, headers = {}) {
  return new NextRequest(`${endpoint}/oauth/${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(data),
  });
}

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
      await assert.rejects(
        oauth.parseMcpAuthorization(
          new NextRequest(
            `${endpoint}/oauth/authorize?${new URLSearchParams({ ...params, redirect_uri: "http://localhost:17551/callback" })}`,
          ),
        ),
        /exact callback/,
      );
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
          origin: "http://localhost:3000",
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
        assert.equal(location.searchParams.get("iss"), "http://localhost:3000");
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
