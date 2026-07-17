"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminActionToast({
  message,
  status = "error",
}: {
  message?: string;
  status?: "error" | "success";
}) {
  const [open, setOpen] = useState(Boolean(message));
  const isSuccess = status === "success";

  useEffect(() => {
    setOpen(Boolean(message));
    if (!message) return;

    const timeout = window.setTimeout(() => setOpen(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message || !open) return null;

  return (
    <div className="fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-md border border-zinc-700 bg-background p-4 text-foreground shadow-lg">
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {isSuccess ? "Saved" : "Action failed"}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {isSuccess ? message : "The action could not be completed."}
          </p>
          {!isSuccess ? (
            <details className="mt-2 text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none text-xs font-medium text-foreground">
                Show details
              </summary>
              <div className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs leading-relaxed">
                {message}
              </div>
            </details>
          ) : null}
        </div>
        <Button
          aria-label="Dismiss notification"
          className="-mr-2 -mt-2 h-8 w-8"
          onClick={() => setOpen(false)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
