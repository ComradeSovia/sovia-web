"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "./data/auth";
import {
  generateMcpKey,
  hashMcpKey,
  requireMcpDatabase,
} from "./data/mcp-settings";

export async function saveMcpSettings(form: FormData) {
  await requireAdminSession();
  const version = new Date(String(form.get("version")));
  if (!Number.isFinite(version.getTime()))
    throw new Error("Invalid settings version. Reload the page.");
  const read = (name: string) => form.get(name) === "on";
  const result = await requireMcpDatabase().adminMcpSettings.updateMany({
    where: { id: "default", updatedAt: version },
    data: {
      enabled: read("enabled"),
      allowWrite: read("allowWrite"),
      allowPublish: read("allowPublish"),
      allowSync: read("allowSync"),
      allowOAuth: read("allowOAuth"),
      allowLegacyEnvKey: read("allowLegacyEnvKey"),
    },
  });
  if (result.count !== 1)
    throw new Error(
      "Settings changed in another session. Reload and try again.",
    );
  revalidatePath("/admin/mcp");
  redirect("/admin/mcp?saved=1");
}

export type McpKeyState = { secret?: string; message?: string; error?: string };
export async function rotateMcpKey(
  _previous: McpKeyState,
  form: FormData,
): Promise<McpKeyState> {
  await requireAdminSession();
  const supplied = String(form.get("apiKey") ?? "").trim();
  if (
    supplied &&
    (supplied.length < 32 || supplied.length > 256 || /\s/.test(supplied))
  )
    return {
      error:
        "Use a key with 32–256 non-whitespace characters, or leave blank to generate one.",
    };
  const secret = supplied || generateMcpKey();
  if (
    [
      process.env.SOVIA_ADMIN_MCP_OAUTH_SECRET,
      process.env.SOVIA_ADMIN_SESSION_SECRET,
      process.env.SOVIA_ADMIN_PASSWORD,
    ].some((value) => value?.trim() === secret)
  )
    return {
      error:
        "Use a dedicated API key, different from admin passwords and signing secrets.",
    };
  try {
    await requireMcpDatabase().adminMcpSettings.update({
      where: { id: "default" },
      data: {
        apiKeyHash: hashMcpKey(secret),
        apiKeyPrefix: secret.slice(0, 12),
        allowLegacyEnvKey: false,
      },
    });
    revalidatePath("/admin/mcp");
    return {
      ...(supplied ? {} : { secret }),
      message:
        "Key replaced. The previous key and environment-key access are disabled. Copy generated keys now; they cannot be retrieved later.",
    };
  } catch {
    return {
      error: "Key could not be saved. Check the database and migration status.",
    };
  }
}

export async function revokeMcpKey() {
  await requireAdminSession();
  await requireMcpDatabase().adminMcpSettings.update({
    where: { id: "default" },
    data: { apiKeyHash: null, apiKeyPrefix: null, allowLegacyEnvKey: false },
  });
  revalidatePath("/admin/mcp");
  redirect("/admin/mcp?revoked=1");
}
