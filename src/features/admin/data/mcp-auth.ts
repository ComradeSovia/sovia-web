import { getMcpOAuthAccess } from "./mcp-oauth";
import type { McpPermission, McpPolicy } from "./mcp-policy";
import { getMcpSettings, hashMcpKey, matchesMcpKey } from "./mcp-settings";

export type McpAccess = {
  actor: string;
  permissions: McpPermission[];
  policy: McpPolicy;
};
export async function authenticateMcp(
  request: Request,
): Promise<McpAccess | null> {
  const policy = await getMcpSettings();
  if (!policy.enabled) return null;
  const token = (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token || token.length > 8192) return null;
  if (matchesMcpKey(token, policy.apiKeyHash)) {
    return {
      actor: `api-key:${hashMcpKey(token).slice(0, 16)}`,
      permissions: ["read", "write", "sync"],
      policy,
    };
  }
  const legacy = process.env.SOVIA_ADMIN_MCP_API_KEY?.trim();
  if (
    policy.allowLegacyEnvKey &&
    legacy &&
    matchesMcpKey(token, hashMcpKey(legacy))
  ) {
    return {
      actor: "environment-api-key",
      permissions: ["read", "write", "sync"],
      policy,
    };
  }
  const oauth = policy.allowOAuth ? getMcpOAuthAccess(token) : undefined;
  return oauth ? { ...oauth, policy } : null;
}
