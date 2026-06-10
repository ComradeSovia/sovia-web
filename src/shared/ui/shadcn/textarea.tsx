import type * as React from "react";
import { cn } from "../../lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-32 w-full rounded-md border border-emerald-500/40 bg-black px-3 py-2 text-sm text-emerald-100 shadow-inner shadow-emerald-950 placeholder:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
