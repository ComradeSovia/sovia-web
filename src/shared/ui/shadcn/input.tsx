import type * as React from "react";
import { cn } from "../../lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-emerald-500/40 bg-black px-3 py-2 text-sm text-emerald-100 shadow-inner shadow-emerald-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
