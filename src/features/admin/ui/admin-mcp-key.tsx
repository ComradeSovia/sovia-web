"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { type McpKeyState, rotateMcpKey } from "../mcp-settings-actions";

export function AdminMcpKey() {
  const [state, action, pending] = useActionState(
    rotateMcpKey,
    {} as McpKeyState,
  );
  return (
    <form action={action} className="space-y-4">
      <label className="grid gap-2 text-sm">
        Custom API key (optional)
        <input
          name="apiKey"
          type="password"
          autoComplete="new-password"
          minLength={32}
          maxLength={256}
          className="rounded-md border bg-background p-2"
          placeholder="Leave blank to generate a secure key"
        />
      </label>
      <Button disabled={pending} type="submit">
        {pending ? "Saving…" : "Generate / replace API key"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.message && (
        <output className="block text-sm text-muted-foreground">
          {state.message}
        </output>
      )}
      {state.secret && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">New API key — shown once</p>
          <code className="block break-all text-sm">{state.secret}</code>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(state.secret ?? "")}
          >
            Copy key
          </Button>
        </div>
      )}
    </form>
  );
}
