export type McpPermission = "read" | "write" | "sync";
export type McpPolicy = {
  enabled: boolean;
  allowWrite: boolean;
  allowPublish: boolean;
  allowSync: boolean;
  allowOAuth: boolean;
  allowLegacyEnvKey: boolean;
};

export function assertMcpVisibilityChange(
  policy: Pick<McpPolicy, "allowPublish">,
  current: boolean,
  next: boolean | undefined,
) {
  if (next !== undefined && next !== current && !policy.allowPublish) {
    throw new Error(
      "Changing public visibility requires the publishing permission.",
    );
  }
}

export function toolPermission(name: string): McpPermission {
  if (name === "content_update_work" || name === "content_create_work")
    return "write";
  if (
    name === "analytics_sync_youtube" ||
    name === "analytics_sync_youtube_comments"
  )
    return "sync";
  return "read";
}

export function canUseMcpTool(
  policy: McpPolicy,
  permissions: readonly McpPermission[],
  name: string,
) {
  const permission = toolPermission(name);
  return (
    policy.enabled &&
    permissions.includes(permission) &&
    (permission !== "write" || policy.allowWrite) &&
    (permission !== "sync" || policy.allowSync)
  );
}
