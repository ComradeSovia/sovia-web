import type * as React from "react";
import { cn } from "../../lib/utils";

export function Alert({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border border-emerald-500/40 bg-black p-4 text-emerald-200",
        className,
      )}
      role="alert"
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-emerald-500", className)} {...props} />
  );
}
